# HelloOracleApi

Minimal Web API menggunakan .NET 10 (LTS) yang terhubung ke Oracle Database Free (26ai) lokal melalui ADO.NET (`Oracle.ManagedDataAccess.Core`).

## Prasyarat

- Windows dengan **.NET 10 SDK (LTS)** terpasang
- **Oracle Database Free (26ai)** berjalan lokal di `localhost:1521` dengan service `FREEPDB1`
- User/schema aplikasi `hello` beserta tabel `greetings` sudah dibuat
- **VS Code** dengan ekstensi *C# Dev Kit* dan *REST Client* (untuk menjalankan `requests.http`)

## Konfigurasi User Secrets

Simpan connection string menggunakan .NET User Secrets agar password tidak tersimpan di dalam kode:

```powershell
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Oracle" "User Id=hello;Password=<password_anda>;Data Source=localhost:1521/FREEPDB1"