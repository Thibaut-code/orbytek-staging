param(
    [Parameter(Mandatory = $true)]
    [string]$SiteUrl
)
$ErrorActionPreference = 'Stop'
$ParsedUrl = $null
if (-not [Uri]::TryCreate($SiteUrl, [UriKind]::Absolute, [ref]$ParsedUrl) -or $ParsedUrl.Scheme -ne 'https' -or $ParsedUrl.Query -or $ParsedUrl.Fragment -or $ParsedUrl.UserInfo) {
    throw 'Indiquez une URL HTTPS complete, sans parametres ni fragment.'
}
$SiteUrl = $ParsedUrl.AbsoluteUri.TrimEnd('/') + '/'
$Encoding = New-Object System.Text.UTF8Encoding($false)
# Pages publiques du site vitrine ; les ancres sont des sections de l'accueil.
# Si le domaine change, mettre aussi à jour les URL JSON-LD, Open Graph, CNAME et la redirection du formulaire.
$PagePaths = @('', 'creations.html', 'tarifs.html', 'creation-sites-web.html', 'applications-sur-mesure.html', 'integrations-automatisations.html', 'support-informatique.html', 'projet-facture-facile.html')
# Valider toutes les pages avant de modifier les fichiers.
foreach ($PagePath in $PagePaths) {
    $FileName = if ($PagePath) { $PagePath } else { 'index.html' }
    $HtmlPath = Join-Path $PSScriptRoot $FileName
    if (-not [IO.File]::Exists($HtmlPath) -or [IO.File]::ReadAllText($HtmlPath) -notmatch '(?i)</head>') {
        throw "Page introuvable ou sans balise head : $FileName"
    }
}
$CanonicalPattern = '(?i)<link\b(?=[^>]*\brel\s*=\s*["'']canonical["''])[^>]*>[^\S\r\n]*(?:\r?\n)?'
foreach ($PagePath in $PagePaths) {
    $FileName = if ($PagePath) { $PagePath } else { 'index.html' }
    $HtmlPath = Join-Path $PSScriptRoot $FileName
    $PageUrl = [System.Security.SecurityElement]::Escape($SiteUrl + $PagePath)
    $Html = [IO.File]::ReadAllText($HtmlPath)
    # Garder les URL de partage et les identifiants JSON-LD cohérents avec la canonique.
    $OldCanonical = [regex]::Match($Html, '<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"')
    if ($OldCanonical.Success) {
        $OldPageUrl = $OldCanonical.Groups[1].Value
        $OldSiteUrl = if ($PagePath -and $OldPageUrl.EndsWith($PagePath)) { $OldPageUrl.Substring(0, $OldPageUrl.Length - $PagePath.Length) } else { $OldPageUrl }
        if ($OldSiteUrl.EndsWith('/')) {
            $Html = $Html.Replace($OldSiteUrl, $SiteUrl)
        }
    }
    $Canonical = '<link rel="canonical" href="' + $PageUrl + '">'
    if ([regex]::IsMatch($Html, $CanonicalPattern)) {
        $Html = [regex]::Replace($Html, $CanonicalPattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($Match) $Canonical + "`n" })
        # Ne conserver qu'une URL canonique, même si l'ancien fichier en avait plusieurs.
        $CanonicalMatches = [regex]::Matches($Html, $CanonicalPattern)
        for ($i = $CanonicalMatches.Count - 1; $i -ge 1; $i--) {
            $Html = $Html.Remove($CanonicalMatches[$i].Index, $CanonicalMatches[$i].Length)
        }
    } else {
        $Html = [regex]::Replace($Html, '(?i)</head>', [System.Text.RegularExpressions.MatchEvaluator]{ param($Match) $Canonical + "`n" + $Match.Value })
    }
    [IO.File]::WriteAllText($HtmlPath, $Html, $Encoding)
}
$Entries = foreach ($PagePath in $PagePaths) {
    $PageUrl = [System.Security.SecurityElement]::Escape($SiteUrl + $PagePath)
    "  <url>`n    <loc>$PageUrl</loc>`n  </url>"
}
$Xml = '<?xml version="1.0" encoding="UTF-8"?>' + "`n" + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "`n" + ($Entries -join "`n") + "`n</urlset>`n"
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'sitemap.xml'), $Xml, $Encoding)
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'robots.txt'), "User-agent: *`nAllow: /`nSitemap: ${SiteUrl}sitemap.xml`n", $Encoding)
Write-Host "Referencement configure pour $SiteUrl"
