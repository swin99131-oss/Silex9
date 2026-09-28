alter table profiles add column if not exists store_name text;
alter table profiles add column if not exists store_category text;
alter table profiles add column if not exists store_bio text;
alter table messages add column if not exists meta jsonb;
