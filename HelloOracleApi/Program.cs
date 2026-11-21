using System.Data;
using Oracle.ManagedDataAccess.Client;
using Oracle.ManagedDataAccess.Types;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Oracle")
    ?? throw new InvalidOperationException("Connection string 'ConnectionStrings:Oracle' belum dikonfigurasi.");

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors();

app.MapGet("/", () => "Work Day, Staff & To-Do List API (.NET + Oracle)");

// ================= STAFF =================

app.MapGet("/staffs", async (CancellationToken ct) =>
{
    var results = new List<StaffDto>();

    await using var conn = new OracleConnection(connectionString);
    await conn.OpenAsync(ct);

    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT id, name FROM staffs ORDER BY id";

    await using var reader = await cmd.ExecuteReaderAsync(ct);
    while (await reader.ReadAsync(ct))
    {
        results.Add(new StaffDto(reader.GetInt64(0), reader.GetString(1)));
    }

    return Results.Ok(results);
});

app.MapPost("/staffs", async (CreateStaffRequest? request, CancellationToken ct) =>
{
    if (request is null || string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(new { error = "Nama staff tidak boleh kosong." });
    }

    var cleanName = request.Name.Trim();
    if (cleanName.Length > 100)
    {
        return Results.BadRequest(new { error = "Nama staff maksimal 100 karakter." });
    }

    await using var conn = new OracleConnection(connectionString);
    await conn.OpenAsync(ct);

    await using var cmd = conn.CreateCommand();
    cmd.BindByName = true;
    cmd.CommandText = "INSERT INTO staffs (name) VALUES (:name) RETURNING id INTO :id";

    cmd.Parameters.Add(new OracleParameter("name", OracleDbType.Varchar2, cleanName, ParameterDirection.Input));
    var idParam = new OracleParameter("id", OracleDbType.Decimal, ParameterDirection.Output);
    cmd.Parameters.Add(idParam);

    await cmd.ExecuteNonQueryAsync(ct);

    var newId = ((OracleDecimal)idParam.Value).ToInt64();
    return Results.Created($"/staffs/{newId}", new StaffDto(newId, cleanName));
});

app.MapDelete("/staffs/{id:long}", async (long id, CancellationToken ct) =>
{
    await using var conn = new OracleConnection(connectionString);
    await conn.OpenAsync(ct);

    await using var cmd = conn.CreateCommand();
    cmd.BindByName = true;
    cmd.CommandText = "DELETE FROM staffs WHERE id = :id";
    cmd.Parameters.Add(new OracleParameter("id", OracleDbType.Int64, id, ParameterDirection.Input));

    var rowsAffected = await cmd.ExecuteNonQueryAsync(ct);
    return rowsAffected > 0 ? Results.NoContent() : Results.NotFound();
});

// ================= HARI KERJA (WORK DAYS) =================

app.MapGet("/work-days", async (CancellationToken ct) =>
{
    var results = new List<WorkDayDto>();

    await using var conn = new OracleConnection(connectionString);
    await conn.OpenAsync(ct);

    await using var cmd = conn.CreateCommand();
    cmd.CommandText = "SELECT id, day_name FROM work_days ORDER BY id";

    await using var reader = await cmd.ExecuteReaderAsync(ct);
    while (await reader.ReadAsync(ct))
    {
        results.Add(new WorkDayDto(reader.GetInt64(0), reader.GetString(1)));
    }

    return Results.Ok(results);
});

app.MapPost("/work-days", async (CreateWorkDayRequest? request, CancellationToken ct) =>
{
    if (request is null || string.IsNullOrWhiteSpace(request.DayName))
    {
        return Results.BadRequest(new { error = "Nama hari kerja tidak boleh kosong." });
    }

    var cleanName = request.DayName.Trim();
    if (cleanName.Length > 50)
    {
        return Results.BadRequest(new { error = "Nama hari kerja maksimal 50 karakter." });
    }

    await using var conn = new OracleConnection(connectionString);
    await conn.OpenAsync(ct);

    await using var cmd = conn.CreateCommand();
    cmd.BindByName = true;
    cmd.CommandText = "INSERT INTO work_days (day_name) VALUES (:day_name) RETURNING id INTO :id";

    cmd.Parameters.Add(new OracleParameter("day_name", OracleDbType.Varchar2, cleanName, ParameterDirection.Input));
    var idParam = new OracleParameter("id", OracleDbType.Decimal, ParameterDirection.Output);
    cmd.Parameters.Add(idParam);

    await cmd.ExecuteNonQueryAsync(ct);

    var newId = ((OracleDecimal)idParam.Value).ToInt64();
    return Results.Created($"/work-days/{newId}", new WorkDayDto(newId, cleanName));
});

app.MapDelete("/work-days/{id:long}", async (long id, CancellationToken ct) =>
{
    await using var conn = new OracleConnection(connectionString);
    await conn.OpenAsync(ct);

    await using var cmd = conn.CreateCommand();
    cmd.BindByName = true;
    cmd.CommandText = "DELETE FROM work_days WHERE id = :id";
    cmd.Parameters.Add(new OracleParameter("id", OracleDbType.Int64, id, ParameterDirection.Input));

    var rowsAffected = await cmd.ExecuteNonQueryAsync(ct);
    return rowsAffected > 0 ? Results.NoContent() : Results.NotFound();
});

// ================= TO-DO LIST PER HARI KERJA =================

app.MapGet("/work-days/{workDayId:long}/todos", async (long workDayId, CancellationToken ct) =>
{
    var results = new List<TodoDto>();

    await using var conn = new OracleConnection(connectionString);
    await conn.OpenAsync(ct);

    await using var cmd = conn.CreateCommand();
    cmd.BindByName = true;
    cmd.CommandText = @"
        SELECT t.id, t.work_day_id, t.staff_id, s.name, t.title, t.is_completed
        FROM todos t
        LEFT JOIN staffs s ON t.staff_id = s.id
        WHERE t.work_day_id = :work_day_id
        ORDER BY t.id";
    cmd.Parameters.Add(new OracleParameter("work_day_id", OracleDbType.Int64, workDayId, ParameterDirection.Input));

    await using var reader = await cmd.ExecuteReaderAsync(ct);
    while (await reader.ReadAsync(ct))
    {
        results.Add(new TodoDto(
            reader.GetInt64(0),
            reader.GetInt64(1),
            reader.IsDBNull(2) ? null : reader.GetInt64(2),
            reader.IsDBNull(3) ? null : reader.GetString(3),
            reader.GetString(4),
            reader.GetInt32(5) == 1
        ));
    }

    return Results.Ok(results);
});

app.MapPost("/work-days/{workDayId:long}/todos", async (long workDayId, CreateTodoRequest? request, CancellationToken ct) =>
{
    if (request is null || string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { error = "Title tidak boleh kosong." });
    }

    if (request.StaffId is null or <= 0)
    {
        return Results.BadRequest(new { error = "Silakan pilih staff terlebih dahulu." });
    }

    var cleanTitle = request.Title.Trim();
    if (cleanTitle.Length > 200)
    {
        return Results.BadRequest(new { error = "Title maksimal 200 karakter." });
    }

    await using var conn = new OracleConnection(connectionString);
    await conn.OpenAsync(ct);

    // Ambil nama staff untuk dikembalikan ke frontend
    string? staffName = null;
    await using (var staffCmd = conn.CreateCommand())
    {
        staffCmd.BindByName = true;
        staffCmd.CommandText = "SELECT name FROM staffs WHERE id = :staff_id";
        staffCmd.Parameters.Add(new OracleParameter("staff_id", OracleDbType.Int64, request.StaffId.Value, ParameterDirection.Input));
        var result = await staffCmd.ExecuteScalarAsync(ct);
        if (result is null)
        {
            return Results.BadRequest(new { error = "Staff tidak ditemukan." });
        }
        staffName = result.ToString();
    }

    await using var cmd = conn.CreateCommand();
    cmd.BindByName = true;
    cmd.CommandText = "INSERT INTO todos (work_day_id, staff_id, title, is_completed) VALUES (:work_day_id, :staff_id, :title, 0) RETURNING id INTO :id";

    cmd.Parameters.Add(new OracleParameter("work_day_id", OracleDbType.Int64, workDayId, ParameterDirection.Input));
    cmd.Parameters.Add(new OracleParameter("staff_id", OracleDbType.Int64, request.StaffId.Value, ParameterDirection.Input));
    cmd.Parameters.Add(new OracleParameter("title", OracleDbType.Varchar2, cleanTitle, ParameterDirection.Input));

    var idParam = new OracleParameter("id", OracleDbType.Decimal, ParameterDirection.Output);
    cmd.Parameters.Add(idParam);

    await cmd.ExecuteNonQueryAsync(ct);

    var newId = ((OracleDecimal)idParam.Value).ToInt64();
    return Results.Created($"/todos/{newId}", new TodoDto(newId, workDayId, request.StaffId.Value, staffName, cleanTitle, false));
});

app.MapPut("/todos/{id:long}", async (long id, UpdateTodoRequest? request, CancellationToken ct) =>
{
    if (request is null || string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { error = "Title tidak boleh kosong." });
    }

    var cleanTitle = request.Title.Trim();
    await using var conn = new OracleConnection(connectionString);
    await conn.OpenAsync(ct);

    await using var cmd = conn.CreateCommand();
    cmd.BindByName = true;
    cmd.CommandText = "UPDATE todos SET title = :title, is_completed = :is_completed WHERE id = :id";

    cmd.Parameters.Add(new OracleParameter("title", OracleDbType.Varchar2, cleanTitle, ParameterDirection.Input));
    cmd.Parameters.Add(new OracleParameter("is_completed", OracleDbType.Int32, request.IsCompleted ? 1 : 0, ParameterDirection.Input));
    cmd.Parameters.Add(new OracleParameter("id", OracleDbType.Int64, id, ParameterDirection.Input));

    var rowsAffected = await cmd.ExecuteNonQueryAsync(ct);
    if (rowsAffected == 0) return Results.NotFound();

    return Results.Ok(new { id, title = cleanTitle, isCompleted = request.IsCompleted });
});

app.MapDelete("/todos/{id:long}", async (long id, CancellationToken ct) =>
{
    await using var conn = new OracleConnection(connectionString);
    await conn.OpenAsync(ct);

    await using var cmd = conn.CreateCommand();
    cmd.BindByName = true;
    cmd.CommandText = "DELETE FROM todos WHERE id = :id";
    cmd.Parameters.Add(new OracleParameter("id", OracleDbType.Int64, id, ParameterDirection.Input));

    var rowsAffected = await cmd.ExecuteNonQueryAsync(ct);
    return rowsAffected > 0 ? Results.NoContent() : Results.NotFound();
});

app.Run();

record StaffDto(long Id, string Name);
record CreateStaffRequest(string? Name);
record WorkDayDto(long Id, string DayName);
record CreateWorkDayRequest(string? DayName);
record TodoDto(long Id, long WorkDayId, long? StaffId, string? StaffName, string Title, bool IsCompleted);
record CreateTodoRequest(string? Title, long? StaffId);
record UpdateTodoRequest(string? Title, bool IsCompleted);