$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:4173/")
$listener.Start()

$contentTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $relativePath = $context.Request.Url.AbsolutePath.TrimStart("/")
        if ([string]::IsNullOrWhiteSpace($relativePath)) {
            $relativePath = "index.html"
        }

        $requestedPath = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
        if (-not $requestedPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or
            -not (Test-Path -LiteralPath $requestedPath -PathType Leaf)) {
            $context.Response.StatusCode = 404
            $body = [System.Text.Encoding]::UTF8.GetBytes("Arquivo não encontrado")
        }
        else {
            $extension = [System.IO.Path]::GetExtension($requestedPath).ToLowerInvariant()
            $context.Response.ContentType = $contentTypes[$extension]
            if (-not $context.Response.ContentType) {
                $context.Response.ContentType = "application/octet-stream"
            }
            $body = [System.IO.File]::ReadAllBytes($requestedPath)
        }

        $context.Response.ContentLength64 = $body.Length
        $context.Response.OutputStream.Write($body, 0, $body.Length)
        $context.Response.OutputStream.Close()
    }
}
finally {
    $listener.Stop()
    $listener.Close()
}
