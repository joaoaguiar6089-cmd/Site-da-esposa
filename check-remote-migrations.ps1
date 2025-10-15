# Script to check remote Supabase migrations status
# This will help identify if migrations are out of sync

Write-Host "Checking remote Supabase migrations..." -ForegroundColor Cyan
Write-Host ""

# Connection string (replace with your actual connection string)
$connectionString = "postgresql://postgres.ejqsaloqrczyfiqljcym:K0e6xyzY*F81*@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"

Write-Host "Step 1: Checking if custom_price column exists in appointments_procedures..." -ForegroundColor Yellow
$query1 = @"
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' 
AND table_name='appointments_procedures'
ORDER BY ordinal_position;
"@

Write-Host "Execute this query:"
Write-Host $query1 -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Checking applied migrations in supabase_migrations table..." -ForegroundColor Yellow
$query2 = @"
SELECT version, name, statements, inserted_at
FROM supabase_migrations.schema_migrations
WHERE version LIKE '202510%'
ORDER BY version DESC
LIMIT 10;
"@

Write-Host "Execute this query:"
Write-Host $query2 -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Check if 20251014000000 migration was applied..." -ForegroundColor Yellow
$query3 = @"
SELECT version, name, statements, inserted_at
FROM supabase_migrations.schema_migrations
WHERE version = '20251014000000'
OR name LIKE '%custom_price%';
"@

Write-Host "Execute this query:"
Write-Host $query3 -ForegroundColor Green
Write-Host ""

Write-Host "To run these queries, use psql:" -ForegroundColor Cyan
Write-Host "psql `"$connectionString`" -c `"<paste query here>`"" -ForegroundColor White
Write-Host ""
Write-Host "Or use Supabase SQL Editor (safer option):" -ForegroundColor Cyan
Write-Host "1. Go to: https://supabase.com/dashboard/project/ejqsaloqrczyfiqljcym/sql/new" -ForegroundColor White
Write-Host "2. Paste each query" -ForegroundColor White
Write-Host "3. Click 'Run'" -ForegroundColor White
