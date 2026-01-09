-- Create direct message threads
CREATE TABLE public.dm_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (user_a <> user_b),
    UNIQUE(user_a, user_b)
);

-- Create direct message table
CREATE TABLE public.dm_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_dm_threads_user_a ON public.dm_threads(user_a);
CREATE INDEX idx_dm_threads_user_b ON public.dm_threads(user_b);
CREATE INDEX idx_dm_messages_thread_id ON public.dm_messages(thread_id);
CREATE INDEX idx_dm_messages_sender_id ON public.dm_messages(sender_id);
CREATE INDEX idx_dm_messages_created_at ON public.dm_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

-- DM thread policies
CREATE POLICY "DM threads are viewable by participants" ON public.dm_threads
    FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Participants can create DM threads" ON public.dm_threads
    FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Participants can update DM threads" ON public.dm_threads
    FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Participants can delete DM threads" ON public.dm_threads
    FOR DELETE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- DM message policies
CREATE POLICY "DM messages are viewable by participants" ON public.dm_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.dm_threads
            WHERE id = thread_id
              AND (user_a = auth.uid() OR user_b = auth.uid())
        )
    );

CREATE POLICY "Participants can send messages" ON public.dm_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1
            FROM public.dm_threads
            WHERE id = thread_id
              AND (user_a = auth.uid() OR user_b = auth.uid())
        )
    );
