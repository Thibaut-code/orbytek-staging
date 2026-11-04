import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.8';
export const env=(name:string)=>Deno.env.get(name)||'';
export const origins=()=>env('CONTACT_ORIGINS').split(',').map(s=>s.trim()).filter(Boolean);
export function admin(){return createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});}
export function checked(result:any){if(result.error)throw Error('database_unavailable');return result.data;}
export const digest=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
