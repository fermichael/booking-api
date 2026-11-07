# Banco de dados

[Voltar ao README](../README.md)

## Instalação nova

Crie um banco vazio `booking_api` e execute [schema.sql](../database/schema.sql) inteiro na conexão desse banco. O arquivo contém uma transação que cria `users`, `time_slots`, `bookings` e as restrições usadas pelos services.

Não há execução automática do schema ao iniciar a API. O script não é idempotente: se as tabelas já existirem, ele falha. Não é necessário nem indicado apagar um banco existente para executar novamente.

## Schema e migration

| Arquivo                                                | Aplicação                                     |
| ------------------------------------------------------ | --------------------------------------------- |
| `database/schema.sql`                                  | Estrutura completa atual para instalação nova |
| `database/migrations/001_rename_students_to_users.sql` | Renomear `students` em um banco antigo        |

A pasta `migrations` registra uma alteração histórica manual; não existe gerenciador automático de migrations neste projeto. Não execute todos os arquivos sequencialmente após instalar o schema atual: ele já cria `users`.

**Banco já existente:** se as tabelas `users`, `time_slots` e `bookings` e suas restrições já estiverem criadas, não reaplique o schema. O arquivo [001_rename_students_to_users.sql](../database/migrations/001_rename_students_to_users.sql) registra a mudança do nome da tabela de contas; ele só se aplica a um banco antigo que ainda tenha `students` e não tenha `users`.

A renomeação preserva os registros e atualiza as referências das chaves estrangeiras no PostgreSQL. Nomes de constraints e sequências antigas podem continuar contendo `students`; isso não significa que a tabela antiga ainda exista.

## Garantias implementadas

- Email único em `users`.
- Papel da conta limitado a `student` ou `teacher`, com padrão `student`.
- Chaves estrangeiras ligam reservas às contas e aos horários existentes.
- `bookings_one_confirmed_per_slot`: índice único parcial em `time_slot_id` para linhas com `status = 'confirmed'`.
- `time_slots_no_overlap`: restrição de exclusão sobre `tstzrange(starts_at, ends_at, '[)')`. Horários adjacentes são permitidos; sobrepostos, não.

O `ON CONFLICT ... DO NOTHING` dos services transforma a recusa de conflito em resultado vazio. O código interpreta esse resultado e o controller responde `409`.

A API aceita somente cancelamento para `cancelled` e exige fim posterior ao início de um horário. Essas duas validações são feitas no código; o schema atual não inclui um `CHECK` equivalente para escritas SQL manuais.

## Instantes e fusos

`TIMESTAMPTZ` representa um instante. Não preserva o nome de um fuso original. O `pg` devolve `Date` no JavaScript, e o JSON representa as datas em UTC. Por exemplo, 14h com deslocamento −03:00 é o mesmo instante que 17h UTC.

## Dados de testes

`npm test` instala o schema em um namespace temporário `booking_test_<processo>_<instante>`, com `search_path` restrito a ele. É necessário ter permissão para criar schemas. A limpeza remove somente esse namespace gerado; as tabelas públicas não são usadas como dados de teste.
