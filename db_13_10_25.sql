--
-- PostgreSQL database dump
--

\restrict KZNo00j28geXhVtG5jDRQw6d8GbOxTDz7KSxBcwfcaZkQfcJ9IKE1pwDWJUC0PV

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2025-10-13 16:50:20

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 8 (class 2615 OID 16909)
-- Name: app; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA app;


ALTER SCHEMA app OWNER TO postgres;

--
-- TOC entry 3 (class 3079 OID 17566)
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- TOC entry 5772 (class 0 OID 0)
-- Dependencies: 3
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- TOC entry 2 (class 3079 OID 16910)
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- TOC entry 5773 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- TOC entry 1156 (class 1247 OID 17034)
-- Name: booking_status; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.booking_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED',
    'NOSHOW'
);


ALTER TYPE app.booking_status OWNER TO postgres;

--
-- TOC entry 1168 (class 1247 OID 17084)
-- Name: gender; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.gender AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER',
    'UNSPECIFIED'
);


ALTER TYPE app.gender OWNER TO postgres;

--
-- TOC entry 1279 (class 1247 OID 18645)
-- Name: media_kind; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.media_kind AS ENUM (
    'IMAGE',
    'VIDEO'
);


ALTER TYPE app.media_kind OWNER TO postgres;

--
-- TOC entry 1159 (class 1247 OID 17046)
-- Name: payment_status; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.payment_status AS ENUM (
    'INIT',
    'PENDING',
    'PAID',
    'FAILED',
    'REFUNDED',
    'REQUIRES_ACTION'
);


ALTER TYPE app.payment_status OWNER TO postgres;

--
-- TOC entry 1273 (class 1247 OID 18620)
-- Name: post_privacy; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.post_privacy AS ENUM (
    'PUBLIC',
    'FRIENDS',
    'ONLY_ME',
    'CUSTOM'
);


ALTER TYPE app.post_privacy OWNER TO postgres;

--
-- TOC entry 1285 (class 1247 OID 18665)
-- Name: reaction_kind; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.reaction_kind AS ENUM (
    'LIKE',
    'LOVE',
    'CARE',
    'HAHA',
    'WOW',
    'SAD',
    'ANGRY'
);


ALTER TYPE app.reaction_kind OWNER TO postgres;

--
-- TOC entry 1165 (class 1247 OID 17072)
-- Name: report_reason; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.report_reason AS ENUM (
    'ABUSE',
    'SELF_HARM',
    'SPAM',
    'ILLEGAL',
    'OTHER'
);


ALTER TYPE app.report_reason OWNER TO postgres;

--
-- TOC entry 1171 (class 1247 OID 17094)
-- Name: user_file_type; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.user_file_type AS ENUM (
    'AVATAR',
    'DOCUMENT',
    'OTHER'
);


ALTER TYPE app.user_file_type OWNER TO postgres;

--
-- TOC entry 1150 (class 1247 OID 17016)
-- Name: user_role; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.user_role AS ENUM (
    'SEEKER',
    'LISTENER',
    'EXPERT',
    'ADMIN'
);


ALTER TYPE app.user_role OWNER TO postgres;

--
-- TOC entry 1153 (class 1247 OID 17026)
-- Name: user_status; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.user_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'DELETED'
);


ALTER TYPE app.user_status OWNER TO postgres;

--
-- TOC entry 1162 (class 1247 OID 17058)
-- Name: wallet_tx_type; Type: TYPE; Schema: app; Owner: postgres
--

CREATE TYPE app.wallet_tx_type AS ENUM (
    'TOPUP',
    'WITHDRAW',
    'EARN',
    'SPEND',
    'REFUND',
    'ADJUST'
);


ALTER TYPE app.wallet_tx_type OWNER TO postgres;

--
-- TOC entry 1297 (class 1247 OID 18757)
-- Name: booking_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.booking_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELED',
    'COMPLETED'
);


ALTER TYPE public.booking_status OWNER TO postgres;

--
-- TOC entry 412 (class 1255 OID 18241)
-- Name: enforce_dm_member_limit(); Type: FUNCTION; Schema: app; Owner: postgres
--

CREATE FUNCTION app.enforce_dm_member_limit() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  ttype text;
  cnt   integer;
BEGIN
  SELECT type INTO ttype FROM app.chat_threads WHERE id = NEW.thread_id;
  IF ttype = 'DM' THEN
    -- (UNIQUE đã chặn trùng user rồi)
    SELECT COUNT(*) INTO cnt FROM app.chat_members WHERE thread_id = NEW.thread_id;
    IF cnt >= 2 THEN
      RAISE EXCEPTION 'DM thread can only have 2 distinct members';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION app.enforce_dm_member_limit() OWNER TO postgres;

--
-- TOC entry 410 (class 1255 OID 18735)
-- Name: fn_posts_touch_updated_at(); Type: FUNCTION; Schema: app; Owner: postgres
--

CREATE FUNCTION app.fn_posts_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$;


ALTER FUNCTION app.fn_posts_touch_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 265 (class 1259 OID 17529)
-- Name: audit_logs; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.audit_logs (
    id bigint NOT NULL,
    user_id bigint,
    action text NOT NULL,
    resource text,
    resource_id bigint,
    ip_addr inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    meta jsonb
);


ALTER TABLE app.audit_logs OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 17528)
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.audit_logs_id_seq OWNER TO postgres;

--
-- TOC entry 5774 (class 0 OID 0)
-- Dependencies: 264
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.audit_logs_id_seq OWNED BY app.audit_logs.id;


--
-- TOC entry 235 (class 1259 OID 17232)
-- Name: bookings; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.bookings (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    expert_id bigint NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    channel text NOT NULL,
    price numeric(12,2) NOT NULL,
    status app.booking_status DEFAULT 'PENDING'::app.booking_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    time_slot tstzrange GENERATED ALWAYS AS (tstzrange(start_at, end_at, '[)'::text)) STORED,
    CONSTRAINT bookings_channel_check CHECK ((channel = ANY (ARRAY['CHAT'::text, 'VIDEO'::text, 'AUDIO'::text]))),
    CONSTRAINT bookings_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT chk_booking_time CHECK ((end_at > start_at))
);


ALTER TABLE app.bookings OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 17231)
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.bookings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.bookings_id_seq OWNER TO postgres;

--
-- TOC entry 5775 (class 0 OID 0)
-- Dependencies: 234
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.bookings_id_seq OWNED BY app.bookings.id;


--
-- TOC entry 270 (class 1259 OID 18562)
-- Name: call_events; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.call_events (
    id bigint NOT NULL,
    call_id bigint NOT NULL,
    at timestamp with time zone DEFAULT now() NOT NULL,
    type text NOT NULL,
    by_user bigint,
    payload jsonb
);


ALTER TABLE app.call_events OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 18561)
-- Name: call_events_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.call_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.call_events_id_seq OWNER TO postgres;

--
-- TOC entry 5776 (class 0 OID 0)
-- Dependencies: 269
-- Name: call_events_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.call_events_id_seq OWNED BY app.call_events.id;


--
-- TOC entry 268 (class 1259 OID 18533)
-- Name: call_sessions; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.call_sessions (
    id bigint NOT NULL,
    thread_id bigint NOT NULL,
    caller_id bigint NOT NULL,
    callee_id bigint NOT NULL,
    kind text NOT NULL,
    status text NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    connected_at timestamp with time zone,
    ended_at timestamp with time zone,
    end_reason text,
    metadata jsonb,
    booking_id bigint,
    CONSTRAINT call_sessions_kind_check CHECK ((kind = ANY (ARRAY['AUDIO'::text, 'VIDEO'::text]))),
    CONSTRAINT call_sessions_status_check CHECK ((status = ANY (ARRAY['INIT'::text, 'RINGING'::text, 'CONNECTED'::text, 'ENDED'::text, 'MISSED'::text, 'REJECTED'::text, 'BUSY'::text, 'FAILED'::text])))
);


ALTER TABLE app.call_sessions OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 18532)
-- Name: call_sessions_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.call_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.call_sessions_id_seq OWNER TO postgres;

--
-- TOC entry 5777 (class 0 OID 0)
-- Dependencies: 267
-- Name: call_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.call_sessions_id_seq OWNED BY app.call_sessions.id;


--
-- TOC entry 250 (class 1259 OID 17386)
-- Name: chat_members; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.chat_members (
    thread_id bigint NOT NULL,
    user_id bigint NOT NULL,
    role_in_thread text,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.chat_members OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 17404)
-- Name: chat_messages; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.chat_messages (
    id bigint NOT NULL,
    thread_id bigint NOT NULL,
    sender_id bigint NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone,
    deleted_at timestamp with time zone
);


ALTER TABLE app.chat_messages OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 17403)
-- Name: chat_messages_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.chat_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.chat_messages_id_seq OWNER TO postgres;

--
-- TOC entry 5778 (class 0 OID 0)
-- Dependencies: 251
-- Name: chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.chat_messages_id_seq OWNED BY app.chat_messages.id;


--
-- TOC entry 266 (class 1259 OID 18246)
-- Name: chat_read_state; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.chat_read_state (
    thread_id bigint NOT NULL,
    user_id bigint NOT NULL,
    last_read_message_id bigint NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.chat_read_state OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 17372)
-- Name: chat_threads; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.chat_threads (
    id bigint NOT NULL,
    type text NOT NULL,
    booking_id bigint,
    last_message_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_threads_type_check CHECK ((type = ANY (ARRAY['DM'::text, 'BOOKING'::text])))
);


ALTER TABLE app.chat_threads OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 17371)
-- Name: chat_threads_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.chat_threads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.chat_threads_id_seq OWNER TO postgres;

--
-- TOC entry 5779 (class 0 OID 0)
-- Dependencies: 248
-- Name: chat_threads_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.chat_threads_id_seq OWNED BY app.chat_threads.id;


--
-- TOC entry 275 (class 1259 OID 18679)
-- Name: comment_reactions; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.comment_reactions (
    comment_id bigint NOT NULL,
    user_id bigint NOT NULL,
    kind app.reaction_kind NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.comment_reactions OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 17460)
-- Name: comments; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.comments (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    author_id bigint NOT NULL,
    anonymous boolean DEFAULT true NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_id bigint,
    edited boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone,
    CONSTRAINT comments_parent_not_self CHECK (((parent_id IS NULL) OR (parent_id <> id)))
);


ALTER TABLE app.comments OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 17459)
-- Name: comments_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.comments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.comments_id_seq OWNER TO postgres;

--
-- TOC entry 5780 (class 0 OID 0)
-- Dependencies: 256
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.comments_id_seq OWNED BY app.comments.id;


--
-- TOC entry 263 (class 1259 OID 17514)
-- Name: consents; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.consents (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    version text NOT NULL,
    consented_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.consents OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 17513)
-- Name: consents_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.consents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.consents_id_seq OWNER TO postgres;

--
-- TOC entry 5781 (class 0 OID 0)
-- Dependencies: 262
-- Name: consents_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.consents_id_seq OWNED BY app.consents.id;


--
-- TOC entry 227 (class 1259 OID 17163)
-- Name: email_verifications; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.email_verifications (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    email public.citext NOT NULL,
    otp_code character(6) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.email_verifications OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 17162)
-- Name: email_verifications_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.email_verifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.email_verifications_id_seq OWNER TO postgres;

--
-- TOC entry 5782 (class 0 OID 0)
-- Dependencies: 226
-- Name: email_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.email_verifications_id_seq OWNED BY app.email_verifications.id;


--
-- TOC entry 233 (class 1259 OID 17216)
-- Name: expert_availabilities; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.expert_availabilities (
    id bigint NOT NULL,
    expert_id bigint NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    is_recurring boolean DEFAULT false NOT NULL,
    rrule text,
    CONSTRAINT chk_avail_time CHECK ((end_at > start_at))
);


ALTER TABLE app.expert_availabilities OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 17215)
-- Name: expert_availabilities_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.expert_availabilities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.expert_availabilities_id_seq OWNER TO postgres;

--
-- TOC entry 5783 (class 0 OID 0)
-- Dependencies: 232
-- Name: expert_availabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.expert_availabilities_id_seq OWNED BY app.expert_availabilities.id;


--
-- TOC entry 229 (class 1259 OID 17180)
-- Name: expert_profiles; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.expert_profiles (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    specialties text[] NOT NULL,
    price_per_session numeric(12,2) NOT NULL,
    rating_avg numeric(2,1),
    kyc_status text DEFAULT 'PENDING'::text NOT NULL,
    intro text,
    CONSTRAINT expert_profiles_price_per_session_check CHECK ((price_per_session >= (0)::numeric)),
    CONSTRAINT expert_profiles_rating_avg_check CHECK (((rating_avg >= (0)::numeric) AND (rating_avg <= (5)::numeric)))
);


ALTER TABLE app.expert_profiles OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 17179)
-- Name: expert_profiles_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.expert_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.expert_profiles_id_seq OWNER TO postgres;

--
-- TOC entry 5784 (class 0 OID 0)
-- Dependencies: 228
-- Name: expert_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.expert_profiles_id_seq OWNED BY app.expert_profiles.id;


--
-- TOC entry 231 (class 1259 OID 17199)
-- Name: listener_profiles; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.listener_profiles (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    intro text,
    verified boolean DEFAULT false NOT NULL
);


ALTER TABLE app.listener_profiles OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 17198)
-- Name: listener_profiles_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.listener_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.listener_profiles_id_seq OWNER TO postgres;

--
-- TOC entry 5785 (class 0 OID 0)
-- Dependencies: 230
-- Name: listener_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.listener_profiles_id_seq OWNED BY app.listener_profiles.id;


--
-- TOC entry 261 (class 1259 OID 17497)
-- Name: moderation_actions; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.moderation_actions (
    id bigint NOT NULL,
    admin_id bigint,
    target_type text NOT NULL,
    target_id bigint NOT NULL,
    action text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT moderation_actions_action_check CHECK ((action = ANY (ARRAY['HIDE'::text, 'DELETE'::text, 'BAN'::text, 'WARN'::text]))),
    CONSTRAINT moderation_actions_target_type_check CHECK ((target_type = ANY (ARRAY['POST'::text, 'COMMENT'::text, 'USER'::text, 'MESSAGE'::text])))
);


ALTER TABLE app.moderation_actions OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 17496)
-- Name: moderation_actions_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.moderation_actions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.moderation_actions_id_seq OWNER TO postgres;

--
-- TOC entry 5786 (class 0 OID 0)
-- Dependencies: 260
-- Name: moderation_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.moderation_actions_id_seq OWNED BY app.moderation_actions.id;


--
-- TOC entry 239 (class 1259 OID 17280)
-- Name: payment_intents; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.payment_intents (
    id bigint NOT NULL,
    booking_id bigint,
    user_id bigint NOT NULL,
    provider text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'VND'::text NOT NULL,
    status app.payment_status DEFAULT 'INIT'::app.payment_status NOT NULL,
    tx_ref text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_ref text,
    provider_tx text
);


ALTER TABLE app.payment_intents OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 17279)
-- Name: payment_intents_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.payment_intents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.payment_intents_id_seq OWNER TO postgres;

--
-- TOC entry 5787 (class 0 OID 0)
-- Dependencies: 238
-- Name: payment_intents_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.payment_intents_id_seq OWNED BY app.payment_intents.id;


--
-- TOC entry 241 (class 1259 OID 17304)
-- Name: payments; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.payments (
    id bigint NOT NULL,
    intent_id bigint NOT NULL,
    paid_at timestamp with time zone,
    status app.payment_status NOT NULL,
    gateway_payload jsonb
);


ALTER TABLE app.payments OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 17303)
-- Name: payments_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.payments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.payments_id_seq OWNER TO postgres;

--
-- TOC entry 5788 (class 0 OID 0)
-- Dependencies: 240
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.payments_id_seq OWNED BY app.payments.id;


--
-- TOC entry 284 (class 1259 OID 18840)
-- Name: payout_accounts; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.payout_accounts (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    bank_name text NOT NULL,
    account_number text NOT NULL,
    account_holder text,
    verified boolean DEFAULT false NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.payout_accounts OWNER TO postgres;

--
-- TOC entry 283 (class 1259 OID 18839)
-- Name: payout_accounts_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.payout_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.payout_accounts_id_seq OWNER TO postgres;

--
-- TOC entry 5789 (class 0 OID 0)
-- Dependencies: 283
-- Name: payout_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.payout_accounts_id_seq OWNED BY app.payout_accounts.id;


--
-- TOC entry 272 (class 1259 OID 18629)
-- Name: post_audience; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.post_audience (
    post_id bigint NOT NULL,
    user_id bigint NOT NULL
);


ALTER TABLE app.post_audience OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 18701)
-- Name: post_files; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.post_files (
    post_id bigint NOT NULL,
    file_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.post_files OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 18650)
-- Name: post_media; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.post_media (
    id bigint NOT NULL,
    post_id bigint NOT NULL,
    kind app.media_kind NOT NULL,
    url text NOT NULL,
    width integer,
    height integer,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.post_media OWNER TO postgres;

--
-- TOC entry 273 (class 1259 OID 18649)
-- Name: post_media_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.post_media_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.post_media_id_seq OWNER TO postgres;

--
-- TOC entry 5790 (class 0 OID 0)
-- Dependencies: 273
-- Name: post_media_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.post_media_id_seq OWNED BY app.post_media.id;


--
-- TOC entry 255 (class 1259 OID 17440)
-- Name: post_reactions; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.post_reactions (
    post_id bigint NOT NULL,
    user_id bigint NOT NULL,
    reaction app.reaction_kind NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.post_reactions OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 18718)
-- Name: post_saves; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.post_saves (
    user_id bigint NOT NULL,
    post_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.post_saves OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 17424)
-- Name: posts; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.posts (
    id bigint NOT NULL,
    author_id bigint NOT NULL,
    anonymous boolean DEFAULT true NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    tags text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    privacy app.post_privacy DEFAULT 'PUBLIC'::app.post_privacy NOT NULL
);


ALTER TABLE app.posts OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 17423)
-- Name: posts_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.posts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.posts_id_seq OWNER TO postgres;

--
-- TOC entry 5791 (class 0 OID 0)
-- Dependencies: 253
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.posts_id_seq OWNED BY app.posts.id;


--
-- TOC entry 278 (class 1259 OID 18765)
-- Name: processed_events; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.processed_events (
    idempotency_key text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now()
);


ALTER TABLE app.processed_events OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 17481)
-- Name: reports; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.reports (
    id bigint NOT NULL,
    target_type text NOT NULL,
    target_id bigint NOT NULL,
    reporter_id bigint NOT NULL,
    reason app.report_reason NOT NULL,
    details text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reports_target_type_check CHECK ((target_type = ANY (ARRAY['POST'::text, 'COMMENT'::text, 'USER'::text, 'MESSAGE'::text])))
);


ALTER TABLE app.reports OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 17480)
-- Name: reports_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.reports_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.reports_id_seq OWNER TO postgres;

--
-- TOC entry 5792 (class 0 OID 0)
-- Dependencies: 258
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.reports_id_seq OWNED BY app.reports.id;


--
-- TOC entry 280 (class 1259 OID 18795)
-- Name: reviews; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.reviews (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    expert_id bigint NOT NULL,
    booking_id bigint,
    rating numeric(2,1) NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


ALTER TABLE app.reviews OWNER TO postgres;

--
-- TOC entry 279 (class 1259 OID 18794)
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.reviews_id_seq OWNER TO postgres;

--
-- TOC entry 5793 (class 0 OID 0)
-- Dependencies: 279
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.reviews_id_seq OWNED BY app.reviews.id;


--
-- TOC entry 237 (class 1259 OID 17258)
-- Name: session_notes; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.session_notes (
    id bigint NOT NULL,
    booking_id bigint NOT NULL,
    expert_id bigint NOT NULL,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.session_notes OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 17257)
-- Name: session_notes_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.session_notes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.session_notes_id_seq OWNER TO postgres;

--
-- TOC entry 5794 (class 0 OID 0)
-- Dependencies: 236
-- Name: session_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.session_notes_id_seq OWNED BY app.session_notes.id;


--
-- TOC entry 247 (class 1259 OID 17351)
-- Name: tips; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.tips (
    id bigint NOT NULL,
    from_user_id bigint NOT NULL,
    to_user_id bigint NOT NULL,
    amount numeric(12,2) NOT NULL,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tips_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE app.tips OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 17350)
-- Name: tips_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.tips_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.tips_id_seq OWNER TO postgres;

--
-- TOC entry 5795 (class 0 OID 0)
-- Dependencies: 246
-- Name: tips_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.tips_id_seq OWNED BY app.tips.id;


--
-- TOC entry 225 (class 1259 OID 17147)
-- Name: user_files; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.user_files (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    file_type app.user_file_type NOT NULL,
    file_url text NOT NULL,
    mime_type text,
    byte_size bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_files_byte_size_check CHECK (((byte_size IS NULL) OR (byte_size >= 0)))
);


ALTER TABLE app.user_files OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 17146)
-- Name: user_files_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.user_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.user_files_id_seq OWNER TO postgres;

--
-- TOC entry 5796 (class 0 OID 0)
-- Dependencies: 224
-- Name: user_files_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.user_files_id_seq OWNED BY app.user_files.id;


--
-- TOC entry 271 (class 1259 OID 18603)
-- Name: user_follows; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.user_follows (
    follower_id bigint NOT NULL,
    followee_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE app.user_follows OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 17121)
-- Name: user_profiles; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.user_profiles (
    user_id bigint NOT NULL,
    display_name text,
    avatar_url text,
    bio text,
    gender app.gender DEFAULT 'UNSPECIFIED'::app.gender,
    year_of_birth integer,
    pii_encrypted jsonb,
    preferences jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_anonymous boolean DEFAULT true NOT NULL,
    CONSTRAINT user_profiles_year_of_birth_check CHECK (((year_of_birth IS NULL) OR ((year_of_birth >= 1900) AND (year_of_birth <= (EXTRACT(year FROM now()))::integer))))
);


ALTER TABLE app.user_profiles OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17136)
-- Name: user_roles; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.user_roles (
    user_id bigint NOT NULL,
    role app.user_role NOT NULL
);


ALTER TABLE app.user_roles OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 18822)
-- Name: user_sessions; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.user_sessions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    token text NOT NULL,
    device_info text,
    ip_address inet,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked boolean DEFAULT false NOT NULL
);


ALTER TABLE app.user_sessions OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 18821)
-- Name: user_sessions_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.user_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.user_sessions_id_seq OWNER TO postgres;

--
-- TOC entry 5797 (class 0 OID 0)
-- Dependencies: 281
-- Name: user_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.user_sessions_id_seq OWNED BY app.user_sessions.id;


--
-- TOC entry 221 (class 1259 OID 17102)
-- Name: users; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.users (
    id bigint NOT NULL,
    handle public.citext NOT NULL,
    email public.citext,
    phone character varying(20),
    password_hash text NOT NULL,
    role_primary app.user_role DEFAULT 'SEEKER'::app.user_role NOT NULL,
    is_email_verified boolean DEFAULT false NOT NULL,
    status app.user_status DEFAULT 'ACTIVE'::app.user_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_email_format_check CHECK ((email OPERATOR(public.~*) '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$'::public.citext))
);


ALTER TABLE app.users OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 17101)
-- Name: users_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.users_id_seq OWNER TO postgres;

--
-- TOC entry 5798 (class 0 OID 0)
-- Dependencies: 220
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.users_id_seq OWNED BY app.users.id;


--
-- TOC entry 245 (class 1259 OID 17335)
-- Name: wallet_ledger; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.wallet_ledger (
    id bigint NOT NULL,
    wallet_id bigint NOT NULL,
    tx_type app.wallet_tx_type NOT NULL,
    amount numeric(14,2) NOT NULL,
    ref_table text,
    ref_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wallet_ledger_amount_check CHECK ((amount <> (0)::numeric))
);


ALTER TABLE app.wallet_ledger OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 17334)
-- Name: wallet_ledger_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.wallet_ledger_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.wallet_ledger_id_seq OWNER TO postgres;

--
-- TOC entry 5799 (class 0 OID 0)
-- Dependencies: 244
-- Name: wallet_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.wallet_ledger_id_seq OWNED BY app.wallet_ledger.id;


--
-- TOC entry 243 (class 1259 OID 17320)
-- Name: wallets; Type: TABLE; Schema: app; Owner: postgres
--

CREATE TABLE app.wallets (
    id bigint NOT NULL,
    owner_user_id bigint NOT NULL,
    balance numeric(14,2) DEFAULT 0 NOT NULL
);


ALTER TABLE app.wallets OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 17319)
-- Name: wallets_id_seq; Type: SEQUENCE; Schema: app; Owner: postgres
--

CREATE SEQUENCE app.wallets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE app.wallets_id_seq OWNER TO postgres;

--
-- TOC entry 5800 (class 0 OID 0)
-- Dependencies: 242
-- Name: wallets_id_seq; Type: SEQUENCE OWNED BY; Schema: app; Owner: postgres
--

ALTER SEQUENCE app.wallets_id_seq OWNED BY app.wallets.id;


--
-- TOC entry 5368 (class 2604 OID 17532)
-- Name: audit_logs id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.audit_logs ALTER COLUMN id SET DEFAULT nextval('app.audit_logs_id_seq'::regclass);


--
-- TOC entry 5330 (class 2604 OID 17235)
-- Name: bookings id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.bookings ALTER COLUMN id SET DEFAULT nextval('app.bookings_id_seq'::regclass);


--
-- TOC entry 5373 (class 2604 OID 18565)
-- Name: call_events id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.call_events ALTER COLUMN id SET DEFAULT nextval('app.call_events_id_seq'::regclass);


--
-- TOC entry 5371 (class 2604 OID 18536)
-- Name: call_sessions id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.call_sessions ALTER COLUMN id SET DEFAULT nextval('app.call_sessions_id_seq'::regclass);


--
-- TOC entry 5350 (class 2604 OID 17407)
-- Name: chat_messages id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_messages ALTER COLUMN id SET DEFAULT nextval('app.chat_messages_id_seq'::regclass);


--
-- TOC entry 5347 (class 2604 OID 17375)
-- Name: chat_threads id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_threads ALTER COLUMN id SET DEFAULT nextval('app.chat_threads_id_seq'::regclass);


--
-- TOC entry 5358 (class 2604 OID 17463)
-- Name: comments id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.comments ALTER COLUMN id SET DEFAULT nextval('app.comments_id_seq'::regclass);


--
-- TOC entry 5366 (class 2604 OID 17517)
-- Name: consents id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.consents ALTER COLUMN id SET DEFAULT nextval('app.consents_id_seq'::regclass);


--
-- TOC entry 5321 (class 2604 OID 17166)
-- Name: email_verifications id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.email_verifications ALTER COLUMN id SET DEFAULT nextval('app.email_verifications_id_seq'::regclass);


--
-- TOC entry 5328 (class 2604 OID 17219)
-- Name: expert_availabilities id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.expert_availabilities ALTER COLUMN id SET DEFAULT nextval('app.expert_availabilities_id_seq'::regclass);


--
-- TOC entry 5324 (class 2604 OID 17183)
-- Name: expert_profiles id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.expert_profiles ALTER COLUMN id SET DEFAULT nextval('app.expert_profiles_id_seq'::regclass);


--
-- TOC entry 5326 (class 2604 OID 17202)
-- Name: listener_profiles id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.listener_profiles ALTER COLUMN id SET DEFAULT nextval('app.listener_profiles_id_seq'::regclass);


--
-- TOC entry 5364 (class 2604 OID 17500)
-- Name: moderation_actions id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.moderation_actions ALTER COLUMN id SET DEFAULT nextval('app.moderation_actions_id_seq'::regclass);


--
-- TOC entry 5336 (class 2604 OID 17283)
-- Name: payment_intents id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payment_intents ALTER COLUMN id SET DEFAULT nextval('app.payment_intents_id_seq'::regclass);


--
-- TOC entry 5340 (class 2604 OID 17307)
-- Name: payments id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payments ALTER COLUMN id SET DEFAULT nextval('app.payments_id_seq'::regclass);


--
-- TOC entry 5387 (class 2604 OID 18843)
-- Name: payout_accounts id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payout_accounts ALTER COLUMN id SET DEFAULT nextval('app.payout_accounts_id_seq'::regclass);


--
-- TOC entry 5376 (class 2604 OID 18653)
-- Name: post_media id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_media ALTER COLUMN id SET DEFAULT nextval('app.post_media_id_seq'::regclass);


--
-- TOC entry 5352 (class 2604 OID 17427)
-- Name: posts id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.posts ALTER COLUMN id SET DEFAULT nextval('app.posts_id_seq'::regclass);


--
-- TOC entry 5362 (class 2604 OID 17484)
-- Name: reports id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.reports ALTER COLUMN id SET DEFAULT nextval('app.reports_id_seq'::regclass);


--
-- TOC entry 5382 (class 2604 OID 18798)
-- Name: reviews id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.reviews ALTER COLUMN id SET DEFAULT nextval('app.reviews_id_seq'::regclass);


--
-- TOC entry 5334 (class 2604 OID 17261)
-- Name: session_notes id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.session_notes ALTER COLUMN id SET DEFAULT nextval('app.session_notes_id_seq'::regclass);


--
-- TOC entry 5345 (class 2604 OID 17354)
-- Name: tips id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.tips ALTER COLUMN id SET DEFAULT nextval('app.tips_id_seq'::regclass);


--
-- TOC entry 5319 (class 2604 OID 17150)
-- Name: user_files id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_files ALTER COLUMN id SET DEFAULT nextval('app.user_files_id_seq'::regclass);


--
-- TOC entry 5384 (class 2604 OID 18825)
-- Name: user_sessions id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_sessions ALTER COLUMN id SET DEFAULT nextval('app.user_sessions_id_seq'::regclass);


--
-- TOC entry 5310 (class 2604 OID 17105)
-- Name: users id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.users ALTER COLUMN id SET DEFAULT nextval('app.users_id_seq'::regclass);


--
-- TOC entry 5343 (class 2604 OID 17338)
-- Name: wallet_ledger id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.wallet_ledger ALTER COLUMN id SET DEFAULT nextval('app.wallet_ledger_id_seq'::regclass);


--
-- TOC entry 5341 (class 2604 OID 17323)
-- Name: wallets id; Type: DEFAULT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.wallets ALTER COLUMN id SET DEFAULT nextval('app.wallets_id_seq'::regclass);


--
-- TOC entry 5515 (class 2606 OID 17537)
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5446 (class 2606 OID 17244)
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- TOC entry 5531 (class 2606 OID 18570)
-- Name: call_events call_events_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.call_events
    ADD CONSTRAINT call_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5523 (class 2606 OID 18543)
-- Name: call_sessions call_sessions_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.call_sessions
    ADD CONSTRAINT call_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5483 (class 2606 OID 17392)
-- Name: chat_members chat_members_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_members
    ADD CONSTRAINT chat_members_pkey PRIMARY KEY (thread_id, user_id);


--
-- TOC entry 5488 (class 2606 OID 17412)
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5520 (class 2606 OID 18251)
-- Name: chat_read_state chat_read_state_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_read_state
    ADD CONSTRAINT chat_read_state_pkey PRIMARY KEY (thread_id, user_id);


--
-- TOC entry 5480 (class 2606 OID 17380)
-- Name: chat_threads chat_threads_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_threads
    ADD CONSTRAINT chat_threads_pkey PRIMARY KEY (id);


--
-- TOC entry 5543 (class 2606 OID 18684)
-- Name: comment_reactions comment_reactions_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.comment_reactions
    ADD CONSTRAINT comment_reactions_pkey PRIMARY KEY (comment_id, user_id);


--
-- TOC entry 5501 (class 2606 OID 17469)
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- TOC entry 5513 (class 2606 OID 17522)
-- Name: consents consents_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.consents
    ADD CONSTRAINT consents_pkey PRIMARY KEY (id);


--
-- TOC entry 5428 (class 2606 OID 17172)
-- Name: email_verifications email_verifications_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.email_verifications
    ADD CONSTRAINT email_verifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5443 (class 2606 OID 17225)
-- Name: expert_availabilities expert_availabilities_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.expert_availabilities
    ADD CONSTRAINT expert_availabilities_pkey PRIMARY KEY (id);


--
-- TOC entry 5434 (class 2606 OID 17190)
-- Name: expert_profiles expert_profiles_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.expert_profiles
    ADD CONSTRAINT expert_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5436 (class 2606 OID 17192)
-- Name: expert_profiles expert_profiles_user_id_key; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.expert_profiles
    ADD CONSTRAINT expert_profiles_user_id_key UNIQUE (user_id);


--
-- TOC entry 5439 (class 2606 OID 17207)
-- Name: listener_profiles listener_profiles_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.listener_profiles
    ADD CONSTRAINT listener_profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 5441 (class 2606 OID 17209)
-- Name: listener_profiles listener_profiles_user_id_key; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.listener_profiles
    ADD CONSTRAINT listener_profiles_user_id_key UNIQUE (user_id);


--
-- TOC entry 5511 (class 2606 OID 17507)
-- Name: moderation_actions moderation_actions_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.moderation_actions
    ADD CONSTRAINT moderation_actions_pkey PRIMARY KEY (id);


--
-- TOC entry 5451 (class 2606 OID 18217)
-- Name: bookings no_overlap_per_expert; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.bookings
    ADD CONSTRAINT no_overlap_per_expert EXCLUDE USING gist (expert_id WITH =, time_slot WITH &&);


--
-- TOC entry 5458 (class 2606 OID 17290)
-- Name: payment_intents payment_intents_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payment_intents
    ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);


--
-- TOC entry 5460 (class 2606 OID 17292)
-- Name: payment_intents payment_intents_tx_ref_key; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payment_intents
    ADD CONSTRAINT payment_intents_tx_ref_key UNIQUE (tx_ref);


--
-- TOC entry 5464 (class 2606 OID 17313)
-- Name: payments payments_intent_id_key; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payments
    ADD CONSTRAINT payments_intent_id_key UNIQUE (intent_id);


--
-- TOC entry 5466 (class 2606 OID 17311)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 5560 (class 2606 OID 18849)
-- Name: payout_accounts payout_accounts_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payout_accounts
    ADD CONSTRAINT payout_accounts_pkey PRIMARY KEY (id);


--
-- TOC entry 5539 (class 2606 OID 18633)
-- Name: post_audience post_audience_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_audience
    ADD CONSTRAINT post_audience_pkey PRIMARY KEY (post_id, user_id);


--
-- TOC entry 5546 (class 2606 OID 18706)
-- Name: post_files post_files_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_files
    ADD CONSTRAINT post_files_pkey PRIMARY KEY (post_id, file_id);


--
-- TOC entry 5541 (class 2606 OID 18658)
-- Name: post_media post_media_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_media
    ADD CONSTRAINT post_media_pkey PRIMARY KEY (id);


--
-- TOC entry 5499 (class 2606 OID 17448)
-- Name: post_reactions post_reactions_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_reactions
    ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (post_id, user_id);


--
-- TOC entry 5549 (class 2606 OID 18723)
-- Name: post_saves post_saves_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_saves
    ADD CONSTRAINT post_saves_pkey PRIMARY KEY (user_id, post_id);


--
-- TOC entry 5496 (class 2606 OID 17434)
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- TOC entry 5551 (class 2606 OID 18772)
-- Name: processed_events processed_events_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.processed_events
    ADD CONSTRAINT processed_events_pkey PRIMARY KEY (idempotency_key);


--
-- TOC entry 5509 (class 2606 OID 17490)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 5554 (class 2606 OID 18804)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- TOC entry 5453 (class 2606 OID 17268)
-- Name: session_notes session_notes_booking_id_key; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.session_notes
    ADD CONSTRAINT session_notes_booking_id_key UNIQUE (booking_id);


--
-- TOC entry 5455 (class 2606 OID 17266)
-- Name: session_notes session_notes_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.session_notes
    ADD CONSTRAINT session_notes_pkey PRIMARY KEY (id);


--
-- TOC entry 5478 (class 2606 OID 17360)
-- Name: tips tips_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.tips
    ADD CONSTRAINT tips_pkey PRIMARY KEY (id);


--
-- TOC entry 5432 (class 2606 OID 17555)
-- Name: email_verifications uq_email_verif_user_all; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.email_verifications
    ADD CONSTRAINT uq_email_verif_user_all UNIQUE (user_id, email);


--
-- TOC entry 5426 (class 2606 OID 17156)
-- Name: user_files user_files_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_files
    ADD CONSTRAINT user_files_pkey PRIMARY KEY (id);


--
-- TOC entry 5537 (class 2606 OID 18608)
-- Name: user_follows user_follows_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_follows
    ADD CONSTRAINT user_follows_pkey PRIMARY KEY (follower_id, followee_id);


--
-- TOC entry 5422 (class 2606 OID 17130)
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- TOC entry 5424 (class 2606 OID 17140)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role);


--
-- TOC entry 5558 (class 2606 OID 18831)
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 5414 (class 2606 OID 17118)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5416 (class 2606 OID 17116)
-- Name: users users_handle_key; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.users
    ADD CONSTRAINT users_handle_key UNIQUE (handle);


--
-- TOC entry 5418 (class 2606 OID 18776)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 5420 (class 2606 OID 17114)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5476 (class 2606 OID 17344)
-- Name: wallet_ledger wallet_ledger_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.wallet_ledger
    ADD CONSTRAINT wallet_ledger_pkey PRIMARY KEY (id);


--
-- TOC entry 5471 (class 2606 OID 17328)
-- Name: wallets wallets_owner_user_id_key; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.wallets
    ADD CONSTRAINT wallets_owner_user_id_key UNIQUE (owner_user_id);


--
-- TOC entry 5473 (class 2606 OID 17326)
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- TOC entry 5516 (class 1259 OID 18593)
-- Name: idx_audit_action_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_audit_action_time ON app.audit_logs USING btree (action, created_at DESC);


--
-- TOC entry 5517 (class 1259 OID 18591)
-- Name: idx_audit_time_desc; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_audit_time_desc ON app.audit_logs USING btree (created_at DESC);


--
-- TOC entry 5518 (class 1259 OID 18592)
-- Name: idx_audit_user_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_audit_user_time ON app.audit_logs USING btree (user_id, created_at DESC);


--
-- TOC entry 5444 (class 1259 OID 17542)
-- Name: idx_avail_expert; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_avail_expert ON app.expert_availabilities USING btree (expert_id, start_at);


--
-- TOC entry 5447 (class 1259 OID 17543)
-- Name: idx_booking_expert; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_booking_expert ON app.bookings USING btree (expert_id, start_at);


--
-- TOC entry 5448 (class 1259 OID 17544)
-- Name: idx_booking_user; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_booking_user ON app.bookings USING btree (user_id, start_at);


--
-- TOC entry 5449 (class 1259 OID 18793)
-- Name: idx_bookings_user_status; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_bookings_user_status ON app.bookings USING btree (user_id, status, start_at DESC);


--
-- TOC entry 5524 (class 1259 OID 18586)
-- Name: idx_call_callee_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_call_callee_time ON app.call_sessions USING btree (callee_id, started_at DESC);


--
-- TOC entry 5525 (class 1259 OID 18585)
-- Name: idx_call_caller_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_call_caller_time ON app.call_sessions USING btree (caller_id, started_at DESC);


--
-- TOC entry 5532 (class 1259 OID 18601)
-- Name: idx_call_events_call_at; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_call_events_call_at ON app.call_events USING btree (call_id, at);


--
-- TOC entry 5533 (class 1259 OID 18597)
-- Name: idx_call_events_call_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_call_events_call_time ON app.call_events USING btree (call_id, at DESC);


--
-- TOC entry 5526 (class 1259 OID 18602)
-- Name: idx_call_sessions_thread_start; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_call_sessions_thread_start ON app.call_sessions USING btree (thread_id, started_at);


--
-- TOC entry 5527 (class 1259 OID 18596)
-- Name: idx_call_thread_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_call_thread_time ON app.call_sessions USING btree (thread_id, started_at DESC);


--
-- TOC entry 5528 (class 1259 OID 18559)
-- Name: idx_call_user_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_call_user_time ON app.call_sessions USING btree (caller_id, started_at DESC);


--
-- TOC entry 5529 (class 1259 OID 18560)
-- Name: idx_call_user_time2; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_call_user_time2 ON app.call_sessions USING btree (callee_id, started_at DESC);


--
-- TOC entry 5484 (class 1259 OID 18243)
-- Name: idx_chat_members_thread_user; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_chat_members_thread_user ON app.chat_members USING btree (thread_id, user_id);


--
-- TOC entry 5489 (class 1259 OID 18244)
-- Name: idx_chat_messages_thread_created; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_chat_messages_thread_created ON app.chat_messages USING btree (thread_id, created_at DESC);


--
-- TOC entry 5490 (class 1259 OID 18598)
-- Name: idx_chat_messages_thread_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_chat_messages_thread_time ON app.chat_messages USING btree (thread_id, created_at DESC);


--
-- TOC entry 5521 (class 1259 OID 18600)
-- Name: idx_chat_read_state_thread_user; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_chat_read_state_thread_user ON app.chat_read_state USING btree (thread_id, user_id);


--
-- TOC entry 5481 (class 1259 OID 18245)
-- Name: idx_chat_threads_last_msg; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_chat_threads_last_msg ON app.chat_threads USING btree (last_message_at DESC);


--
-- TOC entry 5502 (class 1259 OID 18792)
-- Name: idx_comments_parent_created_at; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_comments_parent_created_at ON app.comments USING btree (post_id, parent_id, created_at DESC);


--
-- TOC entry 5503 (class 1259 OID 17549)
-- Name: idx_comments_post; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_comments_post ON app.comments USING btree (post_id, created_at);


--
-- TOC entry 5504 (class 1259 OID 18754)
-- Name: idx_comments_post_created_at; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_comments_post_created_at ON app.comments USING btree (post_id, created_at DESC);


--
-- TOC entry 5505 (class 1259 OID 18755)
-- Name: idx_comments_post_parent_created_at; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_comments_post_parent_created_at ON app.comments USING btree (post_id, parent_id, created_at DESC);


--
-- TOC entry 5506 (class 1259 OID 18594)
-- Name: idx_comments_post_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_comments_post_time ON app.comments USING btree (post_id, created_at DESC);


--
-- TOC entry 5429 (class 1259 OID 18219)
-- Name: idx_email_verif_user_created; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_email_verif_user_created ON app.email_verifications USING btree (user_id, email, created_at DESC);


--
-- TOC entry 5437 (class 1259 OID 17541)
-- Name: idx_expert_specs; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_expert_specs ON app.expert_profiles USING gin (specialties);


--
-- TOC entry 5462 (class 1259 OID 17546)
-- Name: idx_pay_status; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_pay_status ON app.payments USING btree (status);


--
-- TOC entry 5456 (class 1259 OID 17545)
-- Name: idx_pi_status; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_pi_status ON app.payment_intents USING btree (status);


--
-- TOC entry 5544 (class 1259 OID 18717)
-- Name: idx_post_files_post; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_post_files_post ON app.post_files USING btree (post_id, created_at DESC);


--
-- TOC entry 5547 (class 1259 OID 18734)
-- Name: idx_post_saves_post; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_post_saves_post ON app.post_saves USING btree (post_id, created_at DESC);


--
-- TOC entry 5491 (class 1259 OID 18697)
-- Name: idx_posts_author; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_posts_author ON app.posts USING btree (author_id, created_at DESC);


--
-- TOC entry 5492 (class 1259 OID 17548)
-- Name: idx_posts_created; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_posts_created ON app.posts USING btree (created_at DESC);


--
-- TOC entry 5493 (class 1259 OID 18696)
-- Name: idx_posts_created_at; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_posts_created_at ON app.posts USING btree (created_at DESC);


--
-- TOC entry 5494 (class 1259 OID 18698)
-- Name: idx_posts_privacy; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_posts_privacy ON app.posts USING btree (privacy);


--
-- TOC entry 5497 (class 1259 OID 18595)
-- Name: idx_react_post; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_react_post ON app.post_reactions USING btree (post_id);


--
-- TOC entry 5507 (class 1259 OID 17550)
-- Name: idx_reports_target; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_reports_target ON app.reports USING btree (target_type, target_id);


--
-- TOC entry 5552 (class 1259 OID 18820)
-- Name: idx_reviews_expert_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_reviews_expert_time ON app.reviews USING btree (expert_id, created_at DESC);


--
-- TOC entry 5555 (class 1259 OID 18838)
-- Name: idx_sessions_token; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_sessions_token ON app.user_sessions USING btree (token);


--
-- TOC entry 5556 (class 1259 OID 18837)
-- Name: idx_sessions_user_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_sessions_user_time ON app.user_sessions USING btree (user_id, created_at DESC);


--
-- TOC entry 5534 (class 1259 OID 18699)
-- Name: idx_user_follows_followee; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_user_follows_followee ON app.user_follows USING btree (followee_id, created_at DESC);


--
-- TOC entry 5535 (class 1259 OID 18700)
-- Name: idx_user_follows_follower; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_user_follows_follower ON app.user_follows USING btree (follower_id, created_at DESC);


--
-- TOC entry 5409 (class 1259 OID 17540)
-- Name: idx_users_role; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_users_role ON app.users USING btree (role_primary);


--
-- TOC entry 5474 (class 1259 OID 18590)
-- Name: idx_wallet_ledger_wallet_time; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_wallet_ledger_wallet_time ON app.wallet_ledger USING btree (wallet_id, created_at DESC);


--
-- TOC entry 5468 (class 1259 OID 17547)
-- Name: idx_wallet_owner; Type: INDEX; Schema: app; Owner: postgres
--

CREATE INDEX idx_wallet_owner ON app.wallets USING btree (owner_user_id);


--
-- TOC entry 5485 (class 1259 OID 18576)
-- Name: uq_chat_member; Type: INDEX; Schema: app; Owner: postgres
--

CREATE UNIQUE INDEX uq_chat_member ON app.chat_members USING btree (thread_id, user_id);


--
-- TOC entry 5430 (class 1259 OID 17178)
-- Name: uq_email_verif_user; Type: INDEX; Schema: app; Owner: postgres
--

CREATE UNIQUE INDEX uq_email_verif_user ON app.email_verifications USING btree (user_id, email) WHERE (verified = false);


--
-- TOC entry 5467 (class 1259 OID 18588)
-- Name: uq_payments_intent; Type: INDEX; Schema: app; Owner: postgres
--

CREATE UNIQUE INDEX uq_payments_intent ON app.payments USING btree (intent_id);


--
-- TOC entry 5561 (class 1259 OID 18855)
-- Name: uq_payout_user; Type: INDEX; Schema: app; Owner: postgres
--

CREATE UNIQUE INDEX uq_payout_user ON app.payout_accounts USING btree (user_id);


--
-- TOC entry 5461 (class 1259 OID 18587)
-- Name: uq_pi_txref; Type: INDEX; Schema: app; Owner: postgres
--

CREATE UNIQUE INDEX uq_pi_txref ON app.payment_intents USING btree (tx_ref);


--
-- TOC entry 5410 (class 1259 OID 18578)
-- Name: uq_users_email; Type: INDEX; Schema: app; Owner: postgres
--

CREATE UNIQUE INDEX uq_users_email ON app.users USING btree (email) WHERE (email IS NOT NULL);


--
-- TOC entry 5411 (class 1259 OID 18577)
-- Name: uq_users_handle; Type: INDEX; Schema: app; Owner: postgres
--

CREATE UNIQUE INDEX uq_users_handle ON app.users USING btree (handle);


--
-- TOC entry 5412 (class 1259 OID 18777)
-- Name: uq_users_phone; Type: INDEX; Schema: app; Owner: postgres
--

CREATE UNIQUE INDEX uq_users_phone ON app.users USING btree (phone) WHERE (phone IS NOT NULL);


--
-- TOC entry 5469 (class 1259 OID 18589)
-- Name: uq_wallet_owner; Type: INDEX; Schema: app; Owner: postgres
--

CREATE UNIQUE INDEX uq_wallet_owner ON app.wallets USING btree (owner_user_id);


--
-- TOC entry 5486 (class 1259 OID 18599)
-- Name: ux_chat_members_thread_user; Type: INDEX; Schema: app; Owner: postgres
--

CREATE UNIQUE INDEX ux_chat_members_thread_user ON app.chat_members USING btree (thread_id, user_id);


--
-- TOC entry 5620 (class 2620 OID 18242)
-- Name: chat_members trg_dm_member_limit; Type: TRIGGER; Schema: app; Owner: postgres
--

CREATE TRIGGER trg_dm_member_limit BEFORE INSERT ON app.chat_members FOR EACH ROW EXECUTE FUNCTION app.enforce_dm_member_limit();


--
-- TOC entry 5621 (class 2620 OID 18736)
-- Name: posts trg_posts_set_updated_at; Type: TRIGGER; Schema: app; Owner: postgres
--

CREATE TRIGGER trg_posts_set_updated_at BEFORE UPDATE OF title, content, tags, privacy ON app.posts FOR EACH ROW EXECUTE FUNCTION app.fn_posts_touch_updated_at();


--
-- TOC entry 5569 (class 2606 OID 17252)
-- Name: bookings bookings_expert_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.bookings
    ADD CONSTRAINT bookings_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES app.expert_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 5570 (class 2606 OID 17247)
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5603 (class 2606 OID 18571)
-- Name: call_events call_events_call_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.call_events
    ADD CONSTRAINT call_events_call_id_fkey FOREIGN KEY (call_id) REFERENCES app.call_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 5599 (class 2606 OID 18580)
-- Name: call_sessions call_sessions_booking_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.call_sessions
    ADD CONSTRAINT call_sessions_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES app.bookings(id) ON DELETE SET NULL;


--
-- TOC entry 5600 (class 2606 OID 18554)
-- Name: call_sessions call_sessions_callee_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.call_sessions
    ADD CONSTRAINT call_sessions_callee_id_fkey FOREIGN KEY (callee_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5601 (class 2606 OID 18549)
-- Name: call_sessions call_sessions_caller_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.call_sessions
    ADD CONSTRAINT call_sessions_caller_id_fkey FOREIGN KEY (caller_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5602 (class 2606 OID 18544)
-- Name: call_sessions call_sessions_thread_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.call_sessions
    ADD CONSTRAINT call_sessions_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES app.chat_threads(id) ON DELETE CASCADE;


--
-- TOC entry 5581 (class 2606 OID 17393)
-- Name: chat_members chat_members_thread_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_members
    ADD CONSTRAINT chat_members_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES app.chat_threads(id) ON DELETE CASCADE;


--
-- TOC entry 5582 (class 2606 OID 17398)
-- Name: chat_members chat_members_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_members
    ADD CONSTRAINT chat_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5583 (class 2606 OID 17418)
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5584 (class 2606 OID 17413)
-- Name: chat_messages chat_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_messages
    ADD CONSTRAINT chat_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES app.chat_threads(id) ON DELETE CASCADE;


--
-- TOC entry 5596 (class 2606 OID 18262)
-- Name: chat_read_state chat_read_state_last_read_message_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_read_state
    ADD CONSTRAINT chat_read_state_last_read_message_id_fkey FOREIGN KEY (last_read_message_id) REFERENCES app.chat_messages(id) ON DELETE CASCADE;


--
-- TOC entry 5597 (class 2606 OID 18252)
-- Name: chat_read_state chat_read_state_thread_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_read_state
    ADD CONSTRAINT chat_read_state_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES app.chat_threads(id) ON DELETE CASCADE;


--
-- TOC entry 5598 (class 2606 OID 18257)
-- Name: chat_read_state chat_read_state_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_read_state
    ADD CONSTRAINT chat_read_state_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5580 (class 2606 OID 17381)
-- Name: chat_threads chat_threads_booking_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.chat_threads
    ADD CONSTRAINT chat_threads_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES app.bookings(id) ON DELETE SET NULL;


--
-- TOC entry 5609 (class 2606 OID 18685)
-- Name: comment_reactions comment_reactions_comment_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.comment_reactions
    ADD CONSTRAINT comment_reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES app.comments(id) ON DELETE CASCADE;


--
-- TOC entry 5610 (class 2606 OID 18690)
-- Name: comment_reactions comment_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.comment_reactions
    ADD CONSTRAINT comment_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5588 (class 2606 OID 18743)
-- Name: comments comments_author_fk; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.comments
    ADD CONSTRAINT comments_author_fk FOREIGN KEY (author_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5589 (class 2606 OID 17475)
-- Name: comments comments_author_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5590 (class 2606 OID 18748)
-- Name: comments comments_parent_fk; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.comments
    ADD CONSTRAINT comments_parent_fk FOREIGN KEY (parent_id) REFERENCES app.comments(id) ON DELETE CASCADE;


--
-- TOC entry 5591 (class 2606 OID 18738)
-- Name: comments comments_post_fk; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.comments
    ADD CONSTRAINT comments_post_fk FOREIGN KEY (post_id) REFERENCES app.posts(id) ON DELETE CASCADE;


--
-- TOC entry 5592 (class 2606 OID 17470)
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES app.posts(id) ON DELETE CASCADE;


--
-- TOC entry 5595 (class 2606 OID 17523)
-- Name: consents consents_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.consents
    ADD CONSTRAINT consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5565 (class 2606 OID 17173)
-- Name: email_verifications email_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.email_verifications
    ADD CONSTRAINT email_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5568 (class 2606 OID 17226)
-- Name: expert_availabilities expert_availabilities_expert_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.expert_availabilities
    ADD CONSTRAINT expert_availabilities_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES app.expert_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 5566 (class 2606 OID 17193)
-- Name: expert_profiles expert_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.expert_profiles
    ADD CONSTRAINT expert_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5604 (class 2606 OID 18609)
-- Name: user_follows fk_follow_from; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_follows
    ADD CONSTRAINT fk_follow_from FOREIGN KEY (follower_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5605 (class 2606 OID 18614)
-- Name: user_follows fk_follow_to; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_follows
    ADD CONSTRAINT fk_follow_to FOREIGN KEY (followee_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5619 (class 2606 OID 18850)
-- Name: payout_accounts fk_payout_user; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payout_accounts
    ADD CONSTRAINT fk_payout_user FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5615 (class 2606 OID 18815)
-- Name: reviews fk_review_booking; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.reviews
    ADD CONSTRAINT fk_review_booking FOREIGN KEY (booking_id) REFERENCES app.bookings(id) ON DELETE SET NULL;


--
-- TOC entry 5616 (class 2606 OID 18810)
-- Name: reviews fk_review_expert; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.reviews
    ADD CONSTRAINT fk_review_expert FOREIGN KEY (expert_id) REFERENCES app.expert_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 5617 (class 2606 OID 18805)
-- Name: reviews fk_review_user; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.reviews
    ADD CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5618 (class 2606 OID 18832)
-- Name: user_sessions fk_session_user; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_sessions
    ADD CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5567 (class 2606 OID 17210)
-- Name: listener_profiles listener_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.listener_profiles
    ADD CONSTRAINT listener_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5594 (class 2606 OID 17508)
-- Name: moderation_actions moderation_actions_admin_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.moderation_actions
    ADD CONSTRAINT moderation_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES app.users(id) ON DELETE SET NULL;


--
-- TOC entry 5573 (class 2606 OID 17293)
-- Name: payment_intents payment_intents_booking_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payment_intents
    ADD CONSTRAINT payment_intents_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES app.bookings(id) ON DELETE SET NULL;


--
-- TOC entry 5574 (class 2606 OID 17298)
-- Name: payment_intents payment_intents_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payment_intents
    ADD CONSTRAINT payment_intents_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5575 (class 2606 OID 17314)
-- Name: payments payments_intent_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.payments
    ADD CONSTRAINT payments_intent_id_fkey FOREIGN KEY (intent_id) REFERENCES app.payment_intents(id) ON DELETE CASCADE;


--
-- TOC entry 5606 (class 2606 OID 18634)
-- Name: post_audience post_audience_post_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_audience
    ADD CONSTRAINT post_audience_post_id_fkey FOREIGN KEY (post_id) REFERENCES app.posts(id) ON DELETE CASCADE;


--
-- TOC entry 5607 (class 2606 OID 18639)
-- Name: post_audience post_audience_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_audience
    ADD CONSTRAINT post_audience_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5611 (class 2606 OID 18712)
-- Name: post_files post_files_file_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_files
    ADD CONSTRAINT post_files_file_fkey FOREIGN KEY (file_id) REFERENCES app.user_files(id) ON DELETE CASCADE;


--
-- TOC entry 5612 (class 2606 OID 18707)
-- Name: post_files post_files_post_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_files
    ADD CONSTRAINT post_files_post_fkey FOREIGN KEY (post_id) REFERENCES app.posts(id) ON DELETE CASCADE;


--
-- TOC entry 5608 (class 2606 OID 18659)
-- Name: post_media post_media_post_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_media
    ADD CONSTRAINT post_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES app.posts(id) ON DELETE CASCADE;


--
-- TOC entry 5586 (class 2606 OID 17449)
-- Name: post_reactions post_reactions_post_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_reactions
    ADD CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES app.posts(id) ON DELETE CASCADE;


--
-- TOC entry 5587 (class 2606 OID 17454)
-- Name: post_reactions post_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_reactions
    ADD CONSTRAINT post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5613 (class 2606 OID 18729)
-- Name: post_saves post_saves_post_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_saves
    ADD CONSTRAINT post_saves_post_fkey FOREIGN KEY (post_id) REFERENCES app.posts(id) ON DELETE CASCADE;


--
-- TOC entry 5614 (class 2606 OID 18724)
-- Name: post_saves post_saves_user_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.post_saves
    ADD CONSTRAINT post_saves_user_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5585 (class 2606 OID 17435)
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5593 (class 2606 OID 17491)
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5571 (class 2606 OID 17269)
-- Name: session_notes session_notes_booking_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.session_notes
    ADD CONSTRAINT session_notes_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES app.bookings(id) ON DELETE CASCADE;


--
-- TOC entry 5572 (class 2606 OID 17274)
-- Name: session_notes session_notes_expert_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.session_notes
    ADD CONSTRAINT session_notes_expert_id_fkey FOREIGN KEY (expert_id) REFERENCES app.expert_profiles(id) ON DELETE CASCADE;


--
-- TOC entry 5578 (class 2606 OID 17361)
-- Name: tips tips_from_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.tips
    ADD CONSTRAINT tips_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5579 (class 2606 OID 17366)
-- Name: tips tips_to_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.tips
    ADD CONSTRAINT tips_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5564 (class 2606 OID 17157)
-- Name: user_files user_files_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_files
    ADD CONSTRAINT user_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5562 (class 2606 OID 17131)
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5563 (class 2606 OID 17141)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES app.users(id) ON DELETE CASCADE;


--
-- TOC entry 5577 (class 2606 OID 17345)
-- Name: wallet_ledger wallet_ledger_wallet_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.wallet_ledger
    ADD CONSTRAINT wallet_ledger_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES app.wallets(id) ON DELETE CASCADE;


--
-- TOC entry 5576 (class 2606 OID 17329)
-- Name: wallets wallets_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: app; Owner: postgres
--

ALTER TABLE ONLY app.wallets
    ADD CONSTRAINT wallets_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES app.users(id) ON DELETE CASCADE;


-- Completed on 2025-10-13 16:50:20

--
-- PostgreSQL database dump complete
--

\unrestrict KZNo00j28geXhVtG5jDRQw6d8GbOxTDz7KSxBcwfcaZkQfcJ9IKE1pwDWJUC0PV

