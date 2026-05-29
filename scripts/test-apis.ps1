# API Test Script — Brandiv Labs CRM
# Run: .\scripts\test-apis.ps1
# Requires: dev server running on localhost:3000

$BASE = "http://localhost:3000"
$pass = 0
$fail = 0
$errors = @()

function Assert($label, $condition, $detail = "") {
  if ($condition) {
    Write-Host "  [PASS] $label" -ForegroundColor Green
    $script:pass++
  } else {
    Write-Host "  [FAIL] $label $detail" -ForegroundColor Red
    $script:fail++
    $script:errors += "$label $detail"
  }
}

# Use WebSession so PowerShell manages cookies automatically (no manual Set-Cookie parsing)
$webSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

function Req($method, $path, $body = $null, [switch]$noAuth) {
  $params = @{
    Uri             = "$BASE$path"
    Method          = $method
    Headers         = @{ "Content-Type" = "application/json" }
    UseBasicParsing = $true
    ErrorAction     = "SilentlyContinue"
  }
  if (-not $noAuth) { $params["WebSession"] = $webSession }
  if ($body) { $params["Body"] = ($body | ConvertTo-Json -Depth 10) }
  try {
    $r = Invoke-WebRequest @params
    return @{ status = $r.StatusCode; body = ($r.Content | ConvertFrom-Json) }
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    try { $b = ($_.ErrorDetails.Message | ConvertFrom-Json) } catch { $b = @{} }
    return @{ status = $code; body = $b }
  }
}

# ── 1. Auth ───────────────────────────────────────────────────────────────────
Write-Host "`n── Auth ──────────────────────────────────────────────────────────────" -ForegroundColor Cyan

# Get CSRF token (stores csrf cookie in $webSession automatically)
$csrf = Invoke-WebRequest -Uri "$BASE/api/auth/csrf" -UseBasicParsing -WebSession $webSession
$csrfToken = ($csrf.Content | ConvertFrom-Json).csrfToken
Assert "GET /api/auth/csrf returns token" ($csrfToken -ne $null)

# Login — form-encoded, json=true returns JSON instead of redirect
$loginBody = "csrfToken=$csrfToken&email=admin@brandivlabs.com&password=Admin@1234&callbackUrl=$BASE&json=true"
Invoke-WebRequest -Uri "$BASE/api/auth/callback/credentials" `
  -Method POST `
  -Body $loginBody `
  -ContentType "application/x-www-form-urlencoded" `
  -WebSession $webSession `
  -UseBasicParsing -ErrorAction SilentlyContinue | Out-Null

# Verify session
$session = Req "GET" "/api/auth/session"
Assert "GET /api/auth/session returns user"  ($session.body.user.email -eq "admin@brandivlabs.com")
Assert "Session has role"                    ($session.body.user.role  -eq "super_admin")

# ── 2. Lookups ────────────────────────────────────────────────────────────────
Write-Host "`n── Lookups ───────────────────────────────────────────────────────────" -ForegroundColor Cyan

$all = Req "GET" "/api/lookups"
Assert "GET /api/lookups returns success"          ($all.body.success -eq $true)
Assert "Lookups has industry type"                 ($all.body.data.industry.Count -gt 0)
Assert "Lookups has currency type"                 ($all.body.data.currency.Count -gt 0)
Assert "Lookups has country type"                  ($all.body.data.country.Count -gt 0)
Assert "Lookups has payment_terms type"            ($all.body.data.payment_terms.Count -gt 0)
Assert "Lookups has client_source type"            ($all.body.data.client_source.Count -gt 0)

$byType = Req "GET" "/api/lookups?type=industry"
Assert "GET /api/lookups?type=industry returns array" ($byType.body.data.Count -gt 0)
Assert "Industry items have label"                 ($byType.body.data[0].label -ne $null)

# ── 3. Clients ────────────────────────────────────────────────────────────────
Write-Host "`n── Clients ───────────────────────────────────────────────────────────" -ForegroundColor Cyan

$list = Req "GET" "/api/clients"
Assert "GET /api/clients returns success"   ($list.body.success -eq $true)
Assert "GET /api/clients has items array"   ($list.body.data.items -ne $null)
Assert "GET /api/clients has total count"   ($list.body.data.total -ge 0)

$active = Req "GET" "/api/clients?status=active"
Assert "GET /api/clients?status=active success" ($active.body.success -eq $true)

$search = Req "GET" "/api/clients?search=techmark"
Assert "GET /api/clients?search=techmark finds results" ($search.body.data.items.Count -gt 0)

# Create
$newClient = Req "POST" "/api/clients" -body @{
  companyName    = "Test Corp API"
  contactName    = "Test User"
  email          = "test-api@testcorp.com"
  currency       = "USD"
  status         = "pending"
  contractStatus = "not_sent"
  commissionRule = "standard"
}
Assert "POST /api/clients returns 201"          ($newClient.status -eq 201)
Assert "POST /api/clients returns client"       ($newClient.body.data.companyName -eq "Test Corp API")
$clientId = $newClient.body.data.id
Assert "POST /api/clients has id"               ($clientId -ne $null)

# Get by ID
$getClient = Req "GET" "/api/clients/$clientId"
Assert "GET /api/clients/:id returns client"        ($getClient.body.data.id -eq $clientId)
Assert "GET /api/clients/:id has projects array"    ($getClient.body.data.projects -is [array])
Assert "GET /api/clients/:id has invoices array"    ($getClient.body.data.invoices -is [array])

# Update
$upd = Req "PUT" "/api/clients/$clientId" -body @{ status = "active"; city = "Karachi" }
Assert "PUT /api/clients/:id updates status"    ($upd.body.data.status -eq "active")
Assert "PUT /api/clients/:id updates city"      ($upd.body.data.city   -eq "Karachi")

# Validation
$bad = Req "POST" "/api/clients" -body @{ currency = "USD" }
Assert "POST /api/clients validates required fields (400)" ($bad.status -eq 400)

# ── 4. Projects ───────────────────────────────────────────────────────────────
Write-Host "`n── Projects ──────────────────────────────────────────────────────────" -ForegroundColor Cyan

$plist = Req "GET" "/api/projects"
Assert "GET /api/projects returns success"  ($plist.body.success -eq $true)
Assert "GET /api/projects has items"        ($plist.body.data.items -ne $null)

$activeP = Req "GET" "/api/projects?status=active"
Assert "GET /api/projects?status=active success" ($activeP.body.success -eq $true)

$byClient = Req "GET" "/api/projects?clientId=$clientId"
Assert "GET /api/projects?clientId= success" ($byClient.body.success -eq $true)

# Create
$newProj = Req "POST" "/api/projects" -body @{
  name          = "API Test Project"
  clientId      = $clientId
  type          = "one_time"
  currency      = "USD"
  valueOriginal = 5000
  status        = "pending"
}
Assert "POST /api/projects returns 201"          ($newProj.status -eq 201)
Assert "POST /api/projects returns project"      ($newProj.body.data.name -eq "API Test Project")
$projId = $newProj.body.data.id
Assert "POST /api/projects has id"               ($projId -ne $null)
Assert "POST /api/projects valueOriginal is number" ($newProj.body.data.valueOriginal -is [int] -or $newProj.body.data.valueOriginal -is [long] -or $newProj.body.data.valueOriginal -is [double])

# Get by ID
$getProj = Req "GET" "/api/projects/$projId"
Assert "GET /api/projects/:id returns project"       ($getProj.body.data.id -eq $projId)
Assert "GET /api/projects/:id has milestones array"  ($getProj.body.data.milestones -is [array])
Assert "GET /api/projects/:id has timeEntries array" ($getProj.body.data.timeEntries -is [array])
Assert "GET /api/projects/:id has invoices array"    ($getProj.body.data.invoices -is [array])

# Update
$updP = Req "PUT" "/api/projects/$projId" -body @{ progressPct = 25; status = "active"; description = "Updated via API test" }
Assert "PUT /api/projects/:id updates progressPct"  ($updP.body.data.progressPct -eq 25)
Assert "PUT /api/projects/:id updates status"       ($updP.body.data.status -eq "active")

# Validation
$badP = Req "POST" "/api/projects" -body @{ name = "No client" }
Assert "POST /api/projects validates clientId required (400)" ($badP.status -eq 400)

# Soft delete
$del = Req "DELETE" "/api/projects/$projId"
Assert "DELETE /api/projects/:id returns 200" ($del.status -eq 200)
$check = Req "GET" "/api/projects/$projId"
Assert "Archived project status is cancelled" ($check.body.data.status -eq "cancelled")

# ── 5. Invoices ───────────────────────────────────────────────────────────────
Write-Host "`n── Invoices ──────────────────────────────────────────────────────────" -ForegroundColor Cyan

# Recreate project for invoice (the one we archived above)
$newProj2 = Req "POST" "/api/projects" -body @{
  name          = "Invoice Test Project"
  clientId      = $clientId
  type          = "one_time"
  currency      = "USD"
  valueOriginal = 3000
  status        = "active"
}
$projId2 = $newProj2.body.data.id

$ilist = Req "GET" "/api/invoices"
Assert "GET /api/invoices returns success"  ($ilist.body.success -eq $true)
Assert "GET /api/invoices has items"        ($ilist.body.data.items -ne $null)

$iByStatus = Req "GET" "/api/invoices?status=draft"
Assert "GET /api/invoices?status=draft success" ($iByStatus.body.success -eq $true)

# Create invoice
$newInv = Req "POST" "/api/invoices" -body @{
  clientId      = $clientId
  projectId     = $projId2
  currency      = "USD"
  issueDate     = "2025-06-01"
  dueDate       = "2025-06-30"
  paymentTerms  = "Net 30"
  taxPct        = 10
  paymentNumber = 1
  notes         = "API test invoice"
  lineItems     = @(
    @{ description = "Design services"; quantity = 1; rate = 1500 }
    @{ description = "Development"; quantity = 2; rate = 500 }
  )
}
Assert "POST /api/invoices returns 201"                ($newInv.status -eq 201)
Assert "POST /api/invoices has invoiceNumber"          ($newInv.body.data.invoiceNumber -like "INV-*")
Assert "POST /api/invoices status is draft"            ($newInv.body.data.status -eq "draft")
Assert "POST /api/invoices has lineItems"              ($newInv.body.data.lineItems -is [array])
Assert "POST /api/invoices lineItems count is 2"       ($newInv.body.data.lineItems.Count -eq 2)
Assert "POST /api/invoices subtotal is number"         ($newInv.body.data.subtotal -is [int] -or $newInv.body.data.subtotal -is [long] -or $newInv.body.data.subtotal -is [double])
$invId = $newInv.body.data.id
Assert "POST /api/invoices has id"                     ($invId -ne $null)

# Verify totals: 1500 + 2*500 = 2500, tax 10% = 250, total = 2750 (all × 100)
Assert "Invoice subtotal = 250000 (2500 × 100)"        ($newInv.body.data.subtotal -eq 250000)
Assert "Invoice taxAmount = 25000 (250 × 100)"         ($newInv.body.data.taxAmount -eq 25000)
Assert "Invoice totalAmount = 275000 (2750 × 100)"     ($newInv.body.data.totalAmount -eq 275000)

# Get by ID
$getInv = Req "GET" "/api/invoices/$invId"
Assert "GET /api/invoices/:id returns invoice"         ($getInv.body.data.id -eq $invId)
Assert "GET /api/invoices/:id has notes"               ($getInv.body.data.notes -eq "API test invoice")
Assert "GET /api/invoices/:id has client"              ($getInv.body.data.client -ne $null)

# Update invoice (draft)
$updInv = Req "PUT" "/api/invoices/$invId" -body @{ notes = "Updated notes"; paymentTerms = "Net 45" }
Assert "PUT /api/invoices/:id updates notes"            ($updInv.body.data.notes -eq "Updated notes")
Assert "PUT /api/invoices/:id updates paymentTerms"     ($updInv.body.data.paymentTerms -eq "Net 45")

# Send invoice
$sent = Req "POST" "/api/invoices/$invId/send"
Assert "POST /api/invoices/:id/send → status=sent"     ($sent.body.data.status -eq "sent")

# Cannot send twice
$sentAgain = Req "POST" "/api/invoices/$invId/send"
Assert "POST /api/invoices/:id/send again → 400"       ($sentAgain.status -eq 400)

# Mark paid
$paid = Req "POST" "/api/invoices/$invId/pay"
Assert "POST /api/invoices/:id/pay → status=paid"      ($paid.body.data.status -eq "paid")
Assert "POST /api/invoices/:id/pay has paidAt"         ($paid.body.data.paidAt -ne $null)

# Cannot cancel paid
$cancelPaid = Req "DELETE" "/api/invoices/$invId"
Assert "DELETE paid invoice → 500 or 400 (cannot cancel)" ($cancelPaid.status -ge 400)

# Create another invoice to test cancel
$inv2 = Req "POST" "/api/invoices" -body @{
  clientId   = $clientId
  currency   = "USD"
  issueDate  = "2025-07-01"
  dueDate    = "2025-07-31"
  lineItems  = @(@{ description = "Consulting"; quantity = 1; rate = 800 })
}
$inv2Id = $inv2.body.data.id
Assert "Second invoice created for cancel test"        ($inv2Id -ne $null)

$cancelled = Req "DELETE" "/api/invoices/$inv2Id"
Assert "DELETE /api/invoices/:id → status=cancelled"   ($cancelled.body.data.status -eq "cancelled")

# Validation
$badInv = Req "POST" "/api/invoices" -body @{ currency = "USD" }
Assert "POST /api/invoices validates required fields (400)" ($badInv.status -eq 400)

# ── 6. Income ─────────────────────────────────────────────────────────────────
Write-Host "`n── Income ────────────────────────────────────────────────────────────" -ForegroundColor Cyan

# Create a sent invoice to link income to
$sentInv = Req "POST" "/api/invoices" -body @{
  clientId  = $clientId
  currency  = "USD"
  issueDate = "2025-08-01"
  dueDate   = "2025-08-31"
  lineItems = @(@{ description = "Income test service"; quantity = 1; rate = 2000 })
}
$sentInvId = $sentInv.body.data.id
Req "POST" "/api/invoices/$sentInvId/send" | Out-Null

$incList = Req "GET" "/api/income"
Assert "GET /api/income returns success"  ($incList.body.success -eq $true)
Assert "GET /api/income has items"        ($incList.body.data.items -ne $null)

$incByStatus = Req "GET" "/api/income?status=pending"
Assert "GET /api/income?status=pending success" ($incByStatus.body.success -eq $true)

# Create income record — USD 2000 @ 278.50 PKR, 15% WHT, 500 PKR bank charges
$newInc = Req "POST" "/api/income" -body @{
  clientId         = $clientId
  invoiceId        = $sentInvId
  originalAmount   = 2000
  originalCurrency = "USD"
  exchangeRate     = 278.5
  rateSource       = "SBP"
  whtPct           = 15
  gstPct           = 0
  bankChargesPkr   = 500
  paymentMethod    = "Wire"
  transactionRef   = "TXN-TEST-001"
  receivedAt       = "2025-08-15"
  notes            = "Income API test"
}
Assert "POST /api/income returns 201"               ($newInc.status -eq 201)
Assert "POST /api/income has id"                    ($newInc.body.data.id -ne $null)
Assert "POST /api/income status is pending"         ($newInc.body.data.status -eq "pending")
Assert "POST /api/income has grossPkr"              ($newInc.body.data.grossPkr -gt 0)
Assert "POST /api/income has netPkr"                ($newInc.body.data.netPkr -gt 0)
Assert "POST /api/income netPkr < grossPkr"         ($newInc.body.data.netPkr -lt $newInc.body.data.grossPkr)
Assert "POST /api/income period is correct"         ($newInc.body.data.period -eq "2025-08")

# grossPkr = 2000 * 278.5 = 557000 PKR (× 100 = 55700000)
Assert "POST /api/income grossPkr = 55700000"       ($newInc.body.data.grossPkr -eq 55700000)
# whtAmt = 55700000 * 15% = 8355000
Assert "POST /api/income whtAmountPkr = 8355000"    ($newInc.body.data.whtAmountPkr -eq 8355000)
# bankCharges = 500 * 100 = 50000
# netPkr = 55700000 - 8355000 - 50000 = 47295000
Assert "POST /api/income netPkr = 47295000"         ($newInc.body.data.netPkr -eq 47295000)

# Invoice should now be marked paid
$paidInv = Req "GET" "/api/invoices/$sentInvId"
Assert "Invoice auto-marked paid after income"      ($paidInv.body.data.status -eq "paid")

$incId = $newInc.body.data.id

# Get by ID
$getInc = Req "GET" "/api/income/$incId"
Assert "GET /api/income/:id returns record"         ($getInc.body.data.id -eq $incId)
Assert "GET /api/income/:id has client"             ($getInc.body.data.client -ne $null)
Assert "GET /api/income/:id has invoice"            ($getInc.body.data.invoice -ne $null)

# Update notes
$updInc = Req "PUT" "/api/income/$incId" -body @{ notes = "Updated notes"; transactionRef = "TXN-UPDATED" }
Assert "PUT /api/income/:id updates notes"          ($updInc.body.data.notes -eq "Updated notes")
Assert "PUT /api/income/:id updates transactionRef" ($updInc.body.data.transactionRef -eq "TXN-UPDATED")

# Mark cleared
$cleared = Req "PATCH" "/api/income/$incId"
Assert "PATCH /api/income/:id → status=cleared"    ($cleared.body.data.status -eq "cleared")

# Validation
$badInc = Req "POST" "/api/income" -body @{ originalCurrency = "USD" }
Assert "POST /api/income validates required fields (400)" ($badInc.status -eq 400)

# ── 7. Auth guard — unauthenticated ──────────────────────────────────────────
Write-Host "`n── Auth guard (no cookie) ────────────────────────────────────────────" -ForegroundColor Cyan

$unauth  = Req "GET" "/api/clients"  -noAuth
Assert "GET /api/clients without auth → 401"  ($unauth.status  -eq 401)

$unauthP = Req "GET" "/api/projects" -noAuth
Assert "GET /api/projects without auth → 401" ($unauthP.status -eq 401)

$unauthI = Req "GET" "/api/invoices" -noAuth
Assert "GET /api/invoices without auth → 401" ($unauthI.status -eq 401)

$unauthInc = Req "GET" "/api/income" -noAuth
Assert "GET /api/income without auth → 401"   ($unauthInc.status -eq 401)

# ── Cleanup ───────────────────────────────────────────────────────────────────
$cleanup = Req "DELETE" "/api/clients/$clientId"
Assert "Cleanup: archive test client" ($cleanup.status -eq 200)

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "`n══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Results: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
if ($errors.Count -gt 0) {
  Write-Host "`n  Failed tests:" -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
}
Write-Host "══════════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
