-- Migration to add DM notifications
-- 1. Drop existing check constraint on notifications.type and add new one
DO $$
DECLARE
    con_name text;
BEGIN
    SELECT con.conname INTO con_name
    FROM pg_catalog.pg_constraint con
        INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
        INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = connamespace
    WHERE nsp.nspname = 'public'
        AND rel.relname = 'notifications'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) LIKE '%type%IN%like%comment%follow%';

    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.notifications DROP CONSTRAINT ' || con_name;
    END IF;
END $$;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN ('like', 'comment', 'follow', 'message'));

-- 2. Create trigger function for new DM messages
CREATE OR REPLACE FUNCTION public.handle_new_dm_message()
RETURNS TRIGGER AS $$
DECLARE
    recipient_id UUID;
BEGIN
    -- Find the recipient (the participant who is not the sender)
    SELECT
        CASE
            WHEN user_a = NEW.sender_id THEN user_b
            ELSE user_a
        END INTO recipient_id
    FROM public.dm_threads
    WHERE id = NEW.thread_id;

    -- Insert notification if recipient found
    IF recipient_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, actor_id, type, resource_id, content)
        VALUES (recipient_id, NEW.sender_id, 'message', NEW.thread_id, left(NEW.body, 100));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add trigger to dm_messages table
DROP TRIGGER IF EXISTS on_dm_message_created ON public.dm_messages;

CREATE TRIGGER on_dm_message_created
    AFTER INSERT ON public.dm_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_dm_message();
