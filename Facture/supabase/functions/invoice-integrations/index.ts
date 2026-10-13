// Supabase Edge Function - Peppol / Recommand
// peppol-test valide et génère le document via /generate SANS l'envoyer.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const env = (name: string) => Deno.env.get(name) || '';

// Une seule origine est renvoyée : jamais une liste ni une origine arbitraire.
const corsHeaders = (req: Request): Record<string, string> => {
  const allowedOrigins = new Set([
    'https://orbytek.be',
    'https://www.orbytek.be',
    env('APP_ORIGIN').trim(),
  ]);
  const origin = req.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization,x-client-info,apikey,content-type,x-retry-count,traceparent,tracestate,baggage',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (origin && allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
};

const jsonReply = (headers: Record<string, string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });

const cents = (value: number) =>
  Math.round((value + Number.EPSILON) * 100);

async function external(url: string, options: RequestInit) {
  console.log('Calling Recommand:', url);

  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(25000),
  });

  const raw = await response.text();

  console.log('Recommand HTTP status:', response.status);
  console.log('Recommand response:', raw);

  let data: any;

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok || data?.success === false) {
    const details =
      data?.errors ??
      data?.error ??
      data?.message ??
      data?.raw ??
      raw ??
      response.statusText;

    const printable =
      typeof details === 'string'
        ? details
        : JSON.stringify(details);

    throw new Error(
      `Recommand HTTP ${response.status}: ${printable || 'Erreur inconnue'}`
    );
  }

  return data;
}

Deno.serve(async (req) => {
  const headers = corsHeaders(req);
  const reply = (body: unknown, status = 200) => jsonReply(headers, body, status);
  if (req.headers.get('Origin') && !headers['Access-Control-Allow-Origin']) {
    return reply({ error: 'Origine non autorisée' }, 403);
  }
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  if (req.method !== 'POST') {
    return reply({ error: 'Méthode non autorisée' }, 405);
  }

  let job: { document_id: string; action: string } | null = null;

  let admin: ReturnType<typeof createClient> | undefined;

  try {
    admin = createClient(
      env('SUPABASE_URL'),
      env('SUPABASE_SERVICE_ROLE_KEY')
    );
    const token = req.headers
      .get('Authorization')
      ?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return reply({ error: 'Connexion requise' }, 401);
    }

    const { data: auth, error: authError } =
      await admin.auth.getUser(token);

    if (authError || !auth.user) {
      return reply({ error: 'Session invalide' }, 401);
    }

    const actorId = auth.user.id;
    const membership = await admin.from('company_members').select('owner_id').eq('member_id', actorId).maybeSingle();
    if (membership.error && !['42P01','PGRST205'].includes(membership.error.code)) {
      return reply({ error: 'Impossible de vérifier votre accès à la société' }, 503);
    }
    const uid = membership.data?.owner_id || actorId;
    const { action, documentId } = await req.json();

    if (
      action !== 'peppol-test' ||
      !/^[a-f0-9-]{36}$/i.test(documentId)
    ) {
      return reply({ error: 'Demande invalide' }, 400);
    }

    const { data: d, error } = await admin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', uid)
      .single();

    if (error || !d || d.type !== 'facture') {
      return reply({ error: 'Facture introuvable' }, 404);
    }

    // On ne réutilise que les résultats issus d'une génération/validation.
    // Un ancien résultat "test" provenant de /send ne doit pas bloquer /generate.
    const cached = d.peppol;

    if (cached?.mode === 'generate') {
      return reply({ peppol: cached });
    }

    // Identifiants Recommand propres à chaque utilisateur.
    const configs = JSON.parse(
      env('INTEGRATION_ACCOUNTS') || '{}'
    );

    const config = configs[uid];

    if (!config) {
      return reply(
        {
          error:
            'Aucun compte fournisseur configuré pour votre utilisateur.',
        },
        409
      );
    }

    if (
      !config.recommandKey ||
      !config.recommandSecret ||
      !config.testCompanyId ||
      config.peppolEnvironment !== 'test'
    ) {
      return reply(
        {
          error:
            'Configurez une entreprise Recommand de playground et peppolEnvironment=test.',
        },
        409
      );
    }

    const { data: lines, error: lineError } = await admin
      .from('document_lines')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', uid)
      .order('position');

    if (lineError || !lines?.length) {
      return reply(
        { error: 'Prestations indisponibles' },
        400
      );
    }

    let totalCents = 0;

    for (const l of lines) {
      const net = cents(
        Number(l.quantity) * Number(l.unit_price)
      );

      totalCents +=
        net +
        Math.round(
          (net * Number(l.vat_rate)) / 100
        );
    }

    if (
      !Number.isSafeInteger(totalCents) ||
      totalCents <= 0
    ) {
      return reply({ error: 'Montant invalide' }, 400);
    }

    const buyer = d.customer_snapshot || {};

    if (
      !buyer.peppol_id ||
      !buyer.street ||
      !buyer.city ||
      !buyer.postal_code ||
      !buyer.country ||
      !buyer.vat
    ) {
      return reply(
        {
          error:
            'Complétez les coordonnées Peppol du client puis recréez ou modifiez le brouillon pour actualiser son instantané.',
        },
        400
      );
    }

    if (
      lines.some(
        (l: any) => Number(l.vat_rate) === 0
      )
    ) {
      return reply(
        {
          error:
            'TVA 0 % : le motif et la catégorie fiscale doivent être implémentés avant ce test. Les tests actuels prennent en charge 6, 12 et 21 %.',
        },
        400
      );
    }

    const iban = String(
      d.issuer_snapshot?.iban || ''
    ).replace(/\s/g, '');

    if (!iban) {
      return reply(
        {
          error:
            "Ajoutez l'IBAN de l'entreprise émettrice avant le test Peppol.",
        },
        400
      );
    }

    /*
     * IMPORTANT :
     * peppol-test appelle /generate.
     * Aucun document n'est transmis au destinataire.
     *
     * On garde le mécanisme integration_jobs afin de conserver
     * l'historique des tentatives de validation.
     */
    const lock = await admin.rpc(
      'begin_integration_job',
      {
        target_document: documentId,
        target_user: uid,
        target_action: action,
        expected_document: d,
        expected_lines: lines,
      }
    );

    if (lock.error) {
      console.error(
        'begin_integration_job failed:',
        lock.error
      );

      return reply(
        {
          error:
            'Demande déjà initiée ou document indisponible. Vérifiez integration_jobs avant une nouvelle tentative.',
        },
        409
      );
    }

    job = {
      document_id: documentId,
      action,
    };

    const payload = {
      recipient: String(buyer.peppol_id).trim(),
      documentType: 'invoice',

      document: {
        invoiceNumber: String(d.number || ''),
        issueDate: d.issue_date,
        dueDate: d.due_date,
        currency: 'EUR',

        buyer: {
          name: String(buyer.name || ''),
          street: String(buyer.street || ''),
          city: String(buyer.city || ''),
          postalZone: String(
            buyer.postal_code || ''
          ),
          country: String(
            buyer.country || ''
          ).toUpperCase(),
          vatNumber: String(buyer.vat || ''),
        },

        paymentMeans: [
          {
            iban,
          },
        ],

        lines: lines.map((l: any) => ({
          name: String(l.name || ''),
          quantity: Number(l.quantity).toFixed(2),
          unitCode: 'C62',
          netPriceAmount: Number(
            l.unit_price
          ).toFixed(2),
          vat: {
            category: 'S',
            percentage: Number(
              l.vat_rate
            ).toFixed(2),
          },
        })),
      },
    };

    console.log(
      'Recommand company:',
      config.testCompanyId
    );
    console.log(
      'Recommand action: generate'
    );

    // Pas de clé/secret dans les logs.
    console.log(
      'Recommand payload:',
      JSON.stringify(payload)
    );

    const p = await external(
      `https://app.recommand.eu/api/v1/${encodeURIComponent(
        config.testCompanyId
      )}/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(
            config.recommandKey +
              ':' +
              config.recommandSecret
          )}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const saved = {
      mode: 'generate',
      requestedAt: new Date().toISOString(),
      response: p,
    };

    const column = 'peppol';

    const update = await admin
      .from('documents')
      .update({ [column]: saved })
      .eq('id', documentId)
      .eq('user_id', uid);

    if (update.error) {
      console.error(
        'documents.peppol update failed:',
        update.error
      );

      throw new Error(
        "Recommand a validé le document, mais l'enregistrement du résultat dans Supabase a échoué."
      );
    }

    const completed = await admin
      .from('integration_jobs')
      .update({
        state: 'accepted',
        result: saved,
      })
      .eq('document_id', documentId)
      .eq('action', action);

    if (completed.error) {
      console.error(
        'Integration job state could not be saved:',
        completed.error
      );
    }

    return reply({
      [column]: saved,
    });
  } catch (e) {
    console.error(
      'invoice-integrations error:',
      e
    );

    if (job && admin) {
      try {
        const failed = await admin
          .from('integration_jobs')
          .update({
            state: 'needs_review',
            result: {
              mode: 'generate',
              failedAt: new Date().toISOString(),
              error:
                e instanceof Error
                  ? e.message
                  : 'Erreur du service',
            },
          })
          .eq('document_id', job.document_id)
          .eq('action', job.action);

        if (failed.error) {
          console.error(
            'Unable to mark integration job as needs_review:',
            failed.error
          );
        }
      } catch (cleanupError) {
        console.error('Unable to mark integration job as needs_review:', cleanupError);
      }
    }

    return reply(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Erreur du service',
      },
      502
    );
  }
});
