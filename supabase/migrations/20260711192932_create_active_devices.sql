create table public.active_devices (
    user_id uuid references auth.users(id) on delete cascade primary key,
    device_id text not null,
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Set up Row Level Security (RLS)
alter table public.active_devices enable row level security;

-- Create policies
create policy "Users can view their own active device."
    on public.active_devices for select
    using ( auth.uid() = user_id );

create policy "Users can insert their own active device."
    on public.active_devices for insert
    with check ( auth.uid() = user_id );

create policy "Users can update their own active device."
    on public.active_devices for update
    using ( auth.uid() = user_id );

create policy "Users can delete their own active device."
    on public.active_devices for delete
    using ( auth.uid() = user_id );
