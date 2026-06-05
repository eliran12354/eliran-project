--
-- PostgreSQL database dump
--

\restrict mD57NZiObRs2QpE7BLwEQfPhmyBnFGyujiETgyzfZb0ws0x6apEjavNam50bptj

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.9 (Homebrew)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: featured_professionals_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.featured_professionals_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION public.featured_professionals_touch_updated_at() OWNER TO postgres;

--
-- Name: fetch_govmap_talar_prep(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fetch_govmap_talar_prep(_request_body jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  resp_json  jsonb;
  ent        jsonb;
begin
  -- קריאת ה‑API
  select content::jsonb
  into resp_json
  from http_post(
    'https://www.govmap.gov.il/api/layers-catalog/entitiesByPoint',
    _request_body::text,
    'application/json'
  );

  -- הכנסת ה‑entities לטבלה
  for ent in
    select jsonb_array_elements(resp_json->'entities')
  loop
    insert into govmap_talar_prep (object_id, geom, centroid, fields, raw_entity)
    values (
      (ent->>'objectId')::int,
      ent->>'geom',
      ent->'centroid',
      ent->'fields',
      ent
    );
  end loop;
end;
$$;


ALTER FUNCTION public.fetch_govmap_talar_prep(_request_body jsonb) OWNER TO postgres;

--
-- Name: get_govmap_gushim_geojson(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_govmap_gushim_geojson() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result jsonb;
BEGIN
  -- Try Web Mercator (EPSG:3857) - commonly used for web maps
  -- Web Mercator coordinates are typically in meters, can be millions
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'properties', jsonb_build_object(
            'id', id,
            'object_id', object_id,
            'gush_num', gush_num,
            'gush_suffix', gush_suffix,
            'status_text', status_text
          ),
          'geometry', 
          -- Try Web Mercator (EPSG:3857) - coordinates are [x, y] in meters
          -- centroid[0] = x (easting), centroid[1] = y (northing)
          ST_AsGeoJSON(
            ST_Transform(
              ST_SetSRID(
                ST_MakePoint(
                  (centroid->>0)::numeric,
                  (centroid->>1)::numeric
                ),
                3857  -- Web Mercator (EPSG:3857)
              ),
              4326  -- WGS84 SRID
            )
          )::jsonb
        )
      ) FILTER (WHERE centroid IS NOT NULL AND jsonb_typeof(centroid) = 'array'),
      '[]'::jsonb
    )
  )
  INTO result
  FROM govmap_gushim
  WHERE centroid IS NOT NULL
    AND jsonb_typeof(centroid) = 'array'
    AND jsonb_array_length(centroid) >= 2
  LIMIT 20;
  
  RETURN COALESCE(result, '{"type":"FeatureCollection","features":[]}'::jsonb);
END;
$$;


ALTER FUNCTION public.get_govmap_gushim_geojson() OWNER TO postgres;

--
-- Name: get_govmap_parcels_geojson(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_govmap_parcels_geojson() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result jsonb;
BEGIN
  -- Convert centroid jsonb array from ITM (2039) to WGS84 (4326)
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'properties', jsonb_build_object(
            'id', id,
            'object_id', object_id,
            'gush_num', gush_num,
            'gush_suffix', gush_suffix,
            'parcel', parcel,
            'legal_area', legal_area,
            'status_text', status_text,
            'note', note
          ),
          'geometry', 
          ST_AsGeoJSON(
            ST_Transform(
              ST_SetSRID(
                ST_MakePoint(
                  (centroid->>0)::numeric,  -- x (easting)
                  (centroid->>1)::numeric   -- y (northing)
                ),
                2039  -- ITM SRID (Israeli Transverse Mercator)
              ),
              4326  -- WGS84 SRID
            )
          )::jsonb
        )
      ) FILTER (WHERE centroid IS NOT NULL AND jsonb_typeof(centroid) = 'array' AND jsonb_array_length(centroid) >= 2),
      '[]'::jsonb
    )
  )
  INTO result
  FROM govmap_parcels
  WHERE centroid IS NOT NULL
    AND jsonb_typeof(centroid) = 'array'
    AND jsonb_array_length(centroid) >= 2
  LIMIT 5; -- Very small limit - ST_Transform from ITM is slow
  
  RETURN COALESCE(result, '{"type":"FeatureCollection","features":[]}'::jsonb);
END;
$$;


ALTER FUNCTION public.get_govmap_parcels_geojson() OWNER TO postgres;

--
-- Name: get_land_use_mavat_geojson(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_land_use_mavat_geojson(page_num integer DEFAULT 1, page_size integer DEFAULT 500) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result jsonb;
  offset_val integer;
BEGIN
  -- Calculate offset
  offset_val := (page_num - 1) * page_size;
  
  -- Build GeoJSON FeatureCollection from land_use_mavat table
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'properties', jsonb_build_object(
            'id', id,
            'govmap_object_id', govmap_object_id,
            'layer_name', layer_name,
            'mavat_code', mavat_code,
            'mavat_name', mavat_name,
            'pl_id', pl_id,
            'pl_number', pl_number,
            'pl_name', pl_name,
            'station_desc', station_desc,
            'last_update_date', last_update_date,
            'defq', defq,
            'source_code', source_code,
            'area', area,
            'len', len,
            'scraped_at', scraped_at
          ),
          'geometry', 
          CASE 
            -- If geom (polygon/polyline) exists, use it
            WHEN geom IS NOT NULL THEN
              CASE 
                WHEN ST_SRID(geom) = 4326 THEN
                  -- Already WGS84
                  ST_AsGeoJSON(geom)::jsonb
                WHEN ST_SRID(geom) = 3857 THEN
                  -- Web Mercator - transform to WGS84
                  ST_AsGeoJSON(ST_Transform(geom, 4326))::jsonb
                WHEN ST_SRID(geom) = 2039 THEN
                  -- ITM - transform to WGS84
                  ST_AsGeoJSON(ST_Transform(geom, 4326))::jsonb
                WHEN ST_SRID(geom) != 0 AND ST_SRID(geom) IS NOT NULL THEN
                  -- Has other SRID, try to transform to WGS84
                  ST_AsGeoJSON(ST_Transform(geom, 4326))::jsonb
                ELSE
                  -- No SRID or SRID=0, determine by coordinate values
                  -- If coordinates are > 1,000,000, likely Web Mercator (3857)
                  -- Otherwise, likely ITM (2039)
                  CASE 
                    WHEN ST_X(ST_Centroid(geom)) > 1000000 OR ST_Y(ST_Centroid(geom)) > 1000000 THEN
                      -- Web Mercator (EPSG:3857)
                      ST_AsGeoJSON(ST_Transform(ST_SetSRID(geom, 3857), 4326))::jsonb
                    ELSE
                      -- ITM (EPSG:2039)
                      ST_AsGeoJSON(ST_Transform(ST_SetSRID(geom, 2039), 4326))::jsonb
                  END
              END
            -- Otherwise, use centroid_geom as Point
            WHEN centroid_geom IS NOT NULL THEN
              CASE 
                WHEN ST_SRID(centroid_geom) = 4326 THEN
                  -- Already WGS84
                  ST_AsGeoJSON(centroid_geom)::jsonb
                WHEN ST_SRID(centroid_geom) = 3857 THEN
                  -- Web Mercator - transform to WGS84
                  ST_AsGeoJSON(ST_Transform(centroid_geom, 4326))::jsonb
                WHEN ST_SRID(centroid_geom) = 2039 THEN
                  -- ITM - transform to WGS84
                  ST_AsGeoJSON(ST_Transform(centroid_geom, 4326))::jsonb
                WHEN ST_SRID(centroid_geom) != 0 AND ST_SRID(centroid_geom) IS NOT NULL THEN
                  -- Has other SRID, try to transform to WGS84
                  ST_AsGeoJSON(ST_Transform(centroid_geom, 4326))::jsonb
                ELSE
                  -- No SRID or SRID=0, determine by coordinate values
                  CASE 
                    WHEN ST_X(centroid_geom) > 1000000 OR ST_Y(centroid_geom) > 1000000 THEN
                      -- Web Mercator (EPSG:3857)
                      ST_AsGeoJSON(ST_Transform(ST_SetSRID(centroid_geom, 3857), 4326))::jsonb
                    ELSE
                      -- ITM (EPSG:2039)
                      ST_AsGeoJSON(ST_Transform(ST_SetSRID(centroid_geom, 2039), 4326))::jsonb
                  END
              END
            ELSE
              NULL
          END
        )
      ) FILTER (WHERE 
        (geom IS NOT NULL AND ST_IsValid(geom)) OR 
        (centroid_geom IS NOT NULL AND ST_IsValid(centroid_geom))
      ),
      '[]'::jsonb
    )
  )
  INTO result
  FROM (
    SELECT 
      id,
      govmap_object_id,
      layer_name,
      mavat_code,
      mavat_name,
      pl_id,
      pl_number,
      pl_name,
      station_desc,
      last_update_date,
      defq,
      source_code,
      area,
      len,
      centroid_geom,
      geom,
      scraped_at
    FROM land_use_mavat
    WHERE (geom IS NOT NULL AND ST_IsValid(geom)) 
       OR (centroid_geom IS NOT NULL AND ST_IsValid(centroid_geom))
    ORDER BY id
    LIMIT page_size
    OFFSET offset_val
  ) subquery;
  
  RETURN COALESCE(result, '{"type":"FeatureCollection","features":[]}'::jsonb);
END;
$$;


ALTER FUNCTION public.get_land_use_mavat_geojson(page_num integer, page_size integer) OWNER TO postgres;

--
-- Name: get_talar_prep_geojson(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_talar_prep_geojson() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result jsonb;
BEGIN
  -- Convert WKT from Web Mercator (3857) to WGS84 (4326)
  -- Using SRID 3857 works correctly
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'properties', jsonb_build_object(
            'id', id,
            'object_id', object_id
          ) || COALESCE(fields, '{}'::jsonb) || COALESCE(raw_entity, '{}'::jsonb),
          'geometry', 
          ST_AsGeoJSON(ST_Transform(ST_GeomFromText(geom::text, 3857), 4326))::jsonb
        )
      ),
      '[]'::jsonb
    )
  )
  INTO result
  FROM (
    SELECT id, object_id, geom, fields, raw_entity
    FROM govmap_talar_prep
    WHERE geom IS NOT NULL
      AND geom::text ~ '^(MULTIPOLYGON|POLYGON)'
    LIMIT 50  -- Very small limit to prevent timeout
  ) t;
  
  RETURN COALESCE(result, '{"type":"FeatureCollection","features":[]}'::jsonb);
END;
$$;


ALTER FUNCTION public.get_talar_prep_geojson() OWNER TO postgres;

--
-- Name: get_urban_renewal_compounds_geojson(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_urban_renewal_compounds_geojson() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result jsonb;
  source_srid integer;
BEGIN
  -- Get the SRID of the first geometry
  SELECT ST_SRID(geom) INTO source_srid
  FROM govmap_urban_renewal_compounds
  WHERE geom IS NOT NULL
  LIMIT 1;
  
  -- Transform from source SRID to WGS84 (4326)
  -- Common SRIDs for Israel: 2039 (Israel Grid), 4326 (WGS84)
  SELECT jsonb_build_object(
    'type', 'FeatureCollection',
    'features', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'properties', jsonb_build_object(
            'object_id', object_id,
            'caption', caption,
            'heara', heara,
            'kishur', kishur,
            'source', source,
            'project_name', project_name,
            'city_name', city_name,
            'city_code', city_code,
            'neighborhood_name', neighborhood_name,
            'status', status,
            'approval_stage', approval_stage,
            'housing_units', housing_units,
            'planned_units', planned_units,
            'executing_body', executing_body,
            'last_update', last_update,
            'remarks', remarks
          ),
          'geometry', ST_AsGeoJSON(
            CASE 
              WHEN source_srid = 4326 THEN geom
              ELSE ST_Transform(geom, 4326)
            END
          )::jsonb
        )
      ),
      '[]'::jsonb
    )
  )
  INTO result
  FROM govmap_urban_renewal_compounds
  WHERE geom IS NOT NULL;
  
  RETURN COALESCE(result, '{"type":"FeatureCollection","features":[]}'::jsonb);
END;
$$;


ALTER FUNCTION public.get_urban_renewal_compounds_geojson() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: set_updated_at_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at_timestamp() OWNER TO postgres;

--
-- Name: update_nadlan_jobs_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_nadlan_jobs_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_nadlan_jobs_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: upsert_xplan_feature(integer, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.upsert_xplan_feature(p_layer_id integer, p_feature jsonb, p_source_name text DEFAULT NULL::text) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
declare
    v_attr           jsonb := coalesce(p_feature -> 'attributes', '{}'::jsonb);
    v_geom           geometry;
    v_objectid       bigint;
    v_plan_id        text;
    v_plan_name      text;
    v_plan_type      text;
    v_plan_status    text;
    v_plan_stage     text;
    v_district       text;
    v_municipality   text;
    v_area_dunam     numeric;
    v_submission     date;
    v_approval       date;
    v_id             bigint;
begin
    if p_feature -> 'geometry' is null then
        raise notice 'Feature without geometry (layer %)', p_layer_id;
        return null;
    end if;

    v_objectid := (v_attr ->> 'OBJECTID')::bigint;
    if v_objectid is null then
        raise notice 'Feature without OBJECTID (layer %)', p_layer_id;
        return null;
    end if;

    v_plan_id      := v_attr ->> 'PLAN_ID';
    v_plan_name    := v_attr ->> 'PLAN_NAME';
    v_plan_type    := v_attr ->> 'PLAN_TYPE';
    v_plan_status  := v_attr ->> 'PLAN_STATUS';
    v_plan_stage   := v_attr ->> 'PLAN_STAGE';
    v_district     := v_attr ->> 'DISTRICT';
    v_municipality := v_attr ->> 'MUNICIPALITY';
    v_area_dunam   := nullif(v_attr ->> 'AREA_DUNAM', '')::numeric;
    v_submission   := nullif(v_attr ->> 'SUBMISSION_DATE', '')::date;
    v_approval     := nullif(v_attr ->> 'APPROVAL_DATE', '')::date;

    v_geom := ST_ForceCollection(
                 ST_SetSRID(
                   ST_GeomFromGeoJSON((p_feature -> 'geometry')::text),
                   4326
                 )
              );

    insert into public.xplan_features (
        layer_id,
        feature_objectid,
        plan_id,
        plan_name,
        plan_type,
        plan_status,
        plan_stage,
        district,
        municipality,
        area_dunam,
        submission_date,
        approval_date,
        geometry,
        raw_attributes,
        data_source
    )
    values (
        p_layer_id,
        v_objectid,
        v_plan_id,
        v_plan_name,
        v_plan_type,
        v_plan_status,
        v_plan_stage,
        v_district,
        v_municipality,
        v_area_dunam,
        v_submission,
        v_approval,
        v_geom,
        v_attr,
        coalesce(p_source_name, 'xplan_without_77_78')
    )
    on conflict (layer_id, feature_objectid) do update
        set plan_id         = excluded.plan_id,
            plan_name       = excluded.plan_name,
            plan_type       = excluded.plan_type,
            plan_status     = excluded.plan_status,
            plan_stage      = excluded.plan_stage,
            district        = excluded.district,
            municipality    = excluded.municipality,
            area_dunam      = excluded.area_dunam,
            submission_date = excluded.submission_date,
            approval_date   = excluded.approval_date,
            geometry        = excluded.geometry,
            raw_attributes  = excluded.raw_attributes,
            data_source     = excluded.data_source,
            updated_at      = now()
    returning id into v_id;

    return v_id;
end;
$$;


ALTER FUNCTION public.upsert_xplan_feature(p_layer_id integer, p_feature jsonb, p_source_name text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: address_price_trends; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address_price_trends (
    id bigint NOT NULL,
    address_id bigint NOT NULL,
    city_name text,
    street_name text,
    house_number text,
    address text NOT NULL,
    rental_yield_percent numeric(5,2),
    price_increase_percent numeric(5,2),
    prestige_score integer,
    prestige_max integer,
    median_prices_by_rooms jsonb,
    quarter_prices jsonb,
    raw_trends_data jsonb,
    scraped_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.address_price_trends OWNER TO postgres;

--
-- Name: TABLE address_price_trends; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.address_price_trends IS 'נתוני מגמות מחירים לפי כתובת מ-nadlan.gov.il';


--
-- Name: COLUMN address_price_trends.address_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.address_price_trends.address_id IS 'מזהה כתובת ב-nadlan.gov.il (מתוך URL: ?view=address&id=XXXXX)';


--
-- Name: COLUMN address_price_trends.rental_yield_percent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.address_price_trends.rental_yield_percent IS 'תשואת שכירות חציונית שנתית באחוזים';


--
-- Name: COLUMN address_price_trends.price_increase_percent; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.address_price_trends.price_increase_percent IS 'עליית מחירים בשנה האחרונה באחוזים';


--
-- Name: COLUMN address_price_trends.prestige_score; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.address_price_trends.prestige_score IS 'ציון יוקר של השכונה (X מתוך prestige_max)';


--
-- Name: COLUMN address_price_trends.median_prices_by_rooms; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.address_price_trends.median_prices_by_rooms IS 'מחירים חציוניים לפי מספר חדרים במיליון ש"ח (JSON)';


--
-- Name: COLUMN address_price_trends.quarter_prices; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.address_price_trends.quarter_prices IS 'מחירים ברבעון נבחר במיליון ש"ח (JSON)';


--
-- Name: address_price_trends_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.address_price_trends_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.address_price_trends_id_seq OWNER TO postgres;

--
-- Name: address_price_trends_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.address_price_trends_id_seq OWNED BY public.address_price_trends.id;


--
-- Name: api_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_type text NOT NULL,
    source_id text NOT NULL,
    snapshot jsonb NOT NULL,
    fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.api_snapshots OWNER TO postgres;

--
-- Name: app_data_snapshots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_data_snapshots (
    snapshot_key text NOT NULL,
    known_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.app_data_snapshots OWNER TO postgres;

--
-- Name: TABLE app_data_snapshots; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.app_data_snapshots IS 'Fingerprints for sync jobs; used by backend service role only.';


--
-- Name: calculation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calculation_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    calculator_type text NOT NULL,
    input_payload jsonb NOT NULL,
    result_payload jsonb NOT NULL,
    rule_version_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.calculation_logs OWNER TO postgres;

--
-- Name: capital_gains_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.capital_gains_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_version_id uuid NOT NULL,
    asset_type text NOT NULL,
    base_tax_rate numeric,
    allow_purchase_tax_deduction boolean DEFAULT true NOT NULL,
    allow_broker_fee_deduction boolean DEFAULT true NOT NULL,
    allow_lawyer_fee_deduction boolean DEFAULT true NOT NULL,
    allow_renovation_deduction boolean DEFAULT true NOT NULL,
    estimator_only boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.capital_gains_rules OWNER TO postgres;

--
-- Name: construction_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.construction_progress (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    "MAHOZ" text,
    "YESHUV_LAMAS" text,
    "ATAR" text,
    "MISPAR_MITHAM" text,
    "SHEM_MITHAM" text,
    "MIGRASH" text,
    "GUSH" text,
    "HELKA" text,
    "MISPAR_BINYAN" text,
    "KOMOT_BINYAN" text,
    "YEHIDOT_BINYAN" text,
    "SHETAH" text,
    "SHITAT_SHIVUK" text,
    "TAARICH_KOBEA" text,
    "SHNAT_HOZE" text,
    "TAARICH_SHLAV_BNIYA_5" text,
    "TAARICH_SHLAV_BNIYA_7" text,
    "TAARICH_SHLAV_BNIYA_8" text,
    "TAARICH_SHLAV_BNIYA_16" text,
    "TAARICH_SHLAV_BNIYA_18" text,
    "TAARICH_SHLAV_BNIYA_29" text,
    "TAARICH_SHLAV_BNIYA_39" text,
    "TAARICH_SHLAV_BNIYA_42" text
);


ALTER TABLE public.construction_progress OWNER TO postgres;

--
-- Name: construction_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.construction_progress_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.construction_progress_id_seq OWNER TO postgres;

--
-- Name: construction_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.construction_progress_id_seq OWNED BY public.construction_progress.id;


--
-- Name: contact_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    message text NOT NULL,
    CONSTRAINT contact_email_len CHECK (((char_length(TRIM(BOTH FROM email)) >= 3) AND (char_length(TRIM(BOTH FROM email)) <= 320))),
    CONSTRAINT contact_message_len CHECK (((char_length(TRIM(BOTH FROM message)) >= 1) AND (char_length(TRIM(BOTH FROM message)) <= 5000))),
    CONSTRAINT contact_name_len CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 200)))
);


ALTER TABLE public.contact_submissions OWNER TO postgres;

--
-- Name: TABLE contact_submissions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.contact_submissions IS 'פניות מטופס צור קשר באתר';


--
-- Name: dangerous_buildings_active; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.dangerous_buildings_active (
    id bigint NOT NULL,
    treatment_file text NOT NULL,
    address text NOT NULL,
    street_name text,
    house_number text,
    city_name text,
    block_number text,
    parcel_number text,
    building_number text,
    file_number integer,
    order_opening_date date,
    last_visit_date date,
    occupancy_status text,
    treatment_status text,
    from_date date,
    is_banana_building boolean DEFAULT false,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scraped_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.dangerous_buildings_active OWNER TO postgres;

--
-- Name: TABLE dangerous_buildings_active; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.dangerous_buildings_active IS 'רשימת מבנים מסוכנים פעילים לפי סעיף 3, 4';


--
-- Name: COLUMN dangerous_buildings_active.treatment_file; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.treatment_file IS 'תיק טיפול - מזהה ייחודי של התיק';


--
-- Name: COLUMN dangerous_buildings_active.address; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.address IS 'כתובת המבנה';


--
-- Name: COLUMN dangerous_buildings_active.street_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.street_name IS 'שם הרחוב';


--
-- Name: COLUMN dangerous_buildings_active.house_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.house_number IS 'מספר בית';


--
-- Name: COLUMN dangerous_buildings_active.city_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.city_name IS 'שם העיר';


--
-- Name: COLUMN dangerous_buildings_active.block_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.block_number IS 'מספר גוש';


--
-- Name: COLUMN dangerous_buildings_active.parcel_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.parcel_number IS 'מספר חלקה';


--
-- Name: COLUMN dangerous_buildings_active.building_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.building_number IS 'מספר מבנה';


--
-- Name: COLUMN dangerous_buildings_active.file_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.file_number IS 'מספר תיק';


--
-- Name: COLUMN dangerous_buildings_active.order_opening_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.order_opening_date IS 'תאריך פתיחת הצו';


--
-- Name: COLUMN dangerous_buildings_active.last_visit_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.last_visit_date IS 'תאריך ביקור אחרון';


--
-- Name: COLUMN dangerous_buildings_active.occupancy_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.occupancy_status IS 'מצב אכלוס - פרוץ/מאוכלס/פנוי';


--
-- Name: COLUMN dangerous_buildings_active.treatment_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.treatment_status IS 'מצב הטיפול במבנה';


--
-- Name: COLUMN dangerous_buildings_active.from_date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.from_date IS 'תאריך התחלה';


--
-- Name: COLUMN dangerous_buildings_active.is_banana_building; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.dangerous_buildings_active.is_banana_building IS 'האם זה מבנה בננה (מסומן בכוכבית)';


--
-- Name: dangerous_buildings_active_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dangerous_buildings_active_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dangerous_buildings_active_id_seq OWNER TO postgres;

--
-- Name: dangerous_buildings_active_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dangerous_buildings_active_id_seq OWNED BY public.dangerous_buildings_active.id;


--
-- Name: deals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    city_id integer,
    city_name text NOT NULL,
    serial_no integer,
    address text,
    area_m2 numeric,
    deal_date date,
    price_nis numeric,
    block_parcel_subparcel text,
    property_type text,
    rooms numeric,
    floor text,
    trend text,
    source_url text,
    raw jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.deals OWNER TO postgres;

--
-- Name: featured_professionals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.featured_professionals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    headline text,
    description text,
    city text,
    phone text,
    email text,
    website_url text,
    whatsapp text,
    image_url text,
    display_order integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT false NOT NULL
);


ALTER TABLE public.featured_professionals OWNER TO postgres;

--
-- Name: TABLE featured_professionals; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.featured_professionals IS 'בעלי מקצוע מומלצים — פרסום מדשבורד אדמין';


--
-- Name: govmap_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_data (
    id integer NOT NULL,
    govmap_id character varying(255) NOT NULL,
    layer_id character varying(255),
    feature_name text,
    feature_type character varying(255),
    city_name character varying(255),
    region_name character varying(255),
    district character varying(255),
    status character varying(255),
    program_type character varying(255),
    renewal_type character varying(255),
    approval_date date,
    start_date date,
    end_date date,
    area_size numeric(10,2),
    units_count integer,
    developer_name character varying(255),
    budget numeric(15,2),
    ministry_project character varying(255),
    remarks text,
    location_coordinates jsonb,
    additional_data jsonb,
    source_url text,
    updated_at timestamp with time zone DEFAULT now(),
    scraped_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.govmap_data OWNER TO postgres;

--
-- Name: TABLE govmap_data; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.govmap_data IS 'טבלה לשמירת נתוני GovMap - מפה ממשלתית';


--
-- Name: COLUMN govmap_data.govmap_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_data.govmap_id IS 'מזהה ייחודי של הפריט ב-GovMap';


--
-- Name: COLUMN govmap_data.layer_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_data.layer_id IS 'מזהה השכבה ב-GovMap';


--
-- Name: COLUMN govmap_data.feature_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_data.feature_name IS 'שם הפריט';


--
-- Name: COLUMN govmap_data.feature_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_data.feature_type IS 'סוג הפריט';


--
-- Name: COLUMN govmap_data.city_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_data.city_name IS 'שם העיר';


--
-- Name: COLUMN govmap_data.program_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_data.program_type IS 'סוג התוכנית';


--
-- Name: COLUMN govmap_data.renewal_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_data.renewal_type IS 'סוג ההתחדשות';


--
-- Name: COLUMN govmap_data.area_size; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_data.area_size IS 'גודל השטח במ״ר';


--
-- Name: COLUMN govmap_data.units_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_data.units_count IS 'מספר יחידות דיור';


--
-- Name: COLUMN govmap_data.location_coordinates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_data.location_coordinates IS 'קואורדינטות של הפריט (GeoJSON)';


--
-- Name: govmap_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.govmap_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.govmap_data_id_seq OWNER TO postgres;

--
-- Name: govmap_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.govmap_data_id_seq OWNED BY public.govmap_data.id;


--
-- Name: govmap_deals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_deals (
    id bigint NOT NULL,
    deal_id text NOT NULL,
    govmap_layer_id integer,
    deal_type text,
    deal_subtype text,
    asset_type text,
    asset_subtype text,
    city_name text,
    street_name text,
    house_number text,
    parcel_number text,
    block_number text,
    price_nis numeric,
    rooms numeric,
    area_sqm numeric,
    floor integer,
    deal_date date,
    lng double precision,
    lat double precision,
    geometry public.geometry(Point,4326),
    raw_properties jsonb NOT NULL,
    source_radius numeric,
    source_center public.geometry(Point,4326),
    source_request_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.govmap_deals OWNER TO postgres;

--
-- Name: govmap_deals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.govmap_deals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.govmap_deals_id_seq OWNER TO postgres;

--
-- Name: govmap_deals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.govmap_deals_id_seq OWNED BY public.govmap_deals.id;


--
-- Name: govmap_gushim; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_gushim (
    id integer NOT NULL,
    object_id integer NOT NULL,
    gush_num integer,
    gush_suffix character varying(50),
    status_text text,
    centroid jsonb,
    geom text,
    raw_entity jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scraped_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.govmap_gushim OWNER TO postgres;

--
-- Name: TABLE govmap_gushim; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.govmap_gushim IS 'טבלה לשמירת נתוני גושים מ-GovMap API';


--
-- Name: COLUMN govmap_gushim.object_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_gushim.object_id IS 'מזהה ייחודי של הגוש מ-GovMap';


--
-- Name: COLUMN govmap_gushim.gush_num; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_gushim.gush_num IS 'מספר גוש';


--
-- Name: COLUMN govmap_gushim.gush_suffix; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_gushim.gush_suffix IS 'תת גוש';


--
-- Name: COLUMN govmap_gushim.status_text; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_gushim.status_text IS 'סטטוס הגוש';


--
-- Name: COLUMN govmap_gushim.centroid; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_gushim.centroid IS 'נקודת מרכז הגוש (קואורדינטות)';


--
-- Name: COLUMN govmap_gushim.geom; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_gushim.geom IS 'גיאומטריה של הגוש (MULTIPOLYGON)';


--
-- Name: COLUMN govmap_gushim.raw_entity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_gushim.raw_entity IS 'נתונים גולמיים מהתגובה של GovMap';


--
-- Name: govmap_gushim_by_search; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_gushim_by_search (
    id bigint NOT NULL,
    govmap_object_id bigint NOT NULL,
    layer_name text NOT NULL,
    gush_num integer NOT NULL,
    gush_suffix integer DEFAULT 0 NOT NULL,
    status_text text,
    centroid_geom public.geometry,
    geom public.geometry,
    raw_entity jsonb,
    scraped_at timestamp with time zone
);


ALTER TABLE public.govmap_gushim_by_search OWNER TO postgres;

--
-- Name: govmap_gushim_by_search_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.govmap_gushim_by_search_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.govmap_gushim_by_search_id_seq OWNER TO postgres;

--
-- Name: govmap_gushim_by_search_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.govmap_gushim_by_search_id_seq OWNED BY public.govmap_gushim_by_search.id;


--
-- Name: govmap_gushim_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.govmap_gushim_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.govmap_gushim_id_seq OWNER TO postgres;

--
-- Name: govmap_gushim_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.govmap_gushim_id_seq OWNED BY public.govmap_gushim.id;


--
-- Name: govmap_gushim_parcels_by_search; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_gushim_parcels_by_search (
    id bigint NOT NULL,
    govmap_object_id bigint NOT NULL,
    layer_name text NOT NULL,
    gush_num integer NOT NULL,
    gush_suffix integer DEFAULT 0 NOT NULL,
    status_text text,
    parcel integer,
    legal_area_m2 numeric,
    note text,
    centroid_geom public.geometry,
    geom public.geometry,
    raw_entity jsonb,
    scraped_at timestamp with time zone
);


ALTER TABLE public.govmap_gushim_parcels_by_search OWNER TO postgres;

--
-- Name: govmap_gushim_parcels_by_search_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.govmap_gushim_parcels_by_search_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.govmap_gushim_parcels_by_search_id_seq OWNER TO postgres;

--
-- Name: govmap_gushim_parcels_by_search_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.govmap_gushim_parcels_by_search_id_seq OWNED BY public.govmap_gushim_parcels_by_search.id;


--
-- Name: govmap_parcels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_parcels (
    id integer NOT NULL,
    object_id integer NOT NULL,
    gush_num integer,
    gush_suffix character varying(50),
    parcel integer,
    legal_area numeric(15,2),
    status_text text,
    note text,
    centroid jsonb,
    geom text,
    raw_entity jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scraped_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.govmap_parcels OWNER TO postgres;

--
-- Name: TABLE govmap_parcels; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.govmap_parcels IS 'טבלה לשמירת נתוני חלקות מ-GovMap API';


--
-- Name: COLUMN govmap_parcels.object_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_parcels.object_id IS 'מזהה ייחודי של החלקה מ-GovMap';


--
-- Name: COLUMN govmap_parcels.gush_num; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_parcels.gush_num IS 'מספר גוש';


--
-- Name: COLUMN govmap_parcels.gush_suffix; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_parcels.gush_suffix IS 'תת גוש';


--
-- Name: COLUMN govmap_parcels.parcel; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_parcels.parcel IS 'מספר חלקה';


--
-- Name: COLUMN govmap_parcels.legal_area; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_parcels.legal_area IS 'שטח רשום במ"ר';


--
-- Name: COLUMN govmap_parcels.status_text; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_parcels.status_text IS 'סטטוס החלקה';


--
-- Name: COLUMN govmap_parcels.note; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_parcels.note IS 'הערות על החלקה';


--
-- Name: COLUMN govmap_parcels.centroid; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_parcels.centroid IS 'נקודת מרכז החלקה (קואורדינטות)';


--
-- Name: COLUMN govmap_parcels.geom; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_parcels.geom IS 'גיאומטריה של החלקה (MULTIPOLYGON)';


--
-- Name: COLUMN govmap_parcels.raw_entity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_parcels.raw_entity IS 'נתונים גולמיים מהתגובה של GovMap';


--
-- Name: govmap_parcels_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_parcels_data (
    id bigint NOT NULL,
    objectid integer NOT NULL,
    gush_num integer,
    gush_suffix text,
    parcel integer,
    legal_area numeric,
    status_text text,
    note text,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.govmap_parcels_data OWNER TO postgres;

--
-- Name: govmap_parcels_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.govmap_parcels_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.govmap_parcels_data_id_seq OWNER TO postgres;

--
-- Name: govmap_parcels_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.govmap_parcels_data_id_seq OWNED BY public.govmap_parcels_data.id;


--
-- Name: govmap_parcels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.govmap_parcels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.govmap_parcels_id_seq OWNER TO postgres;

--
-- Name: govmap_parcels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.govmap_parcels_id_seq OWNED BY public.govmap_parcels.id;


--
-- Name: govmap_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_plans (
    pk bigint NOT NULL,
    objectid bigint NOT NULL,
    tochnit text,
    migrash text,
    mishasava bigint,
    kodyeud bigint,
    shape_area numeric,
    shape_length numeric,
    coordinates jsonb,
    bbox jsonb,
    fetched_at timestamp with time zone DEFAULT now(),
    raw jsonb NOT NULL
);


ALTER TABLE public.govmap_plans OWNER TO postgres;

--
-- Name: govmap_plans_pk_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.govmap_plans ALTER COLUMN pk ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.govmap_plans_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: govmap_plans_rami; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_plans_rami (
    id integer NOT NULL,
    object_id integer NOT NULL,
    tochnit character varying(100),
    prjname text,
    statustochnit character varying(100),
    ishuvim text,
    yazam text,
    yeudikari text,
    ydmelay integer,
    merchavrmi integer,
    prjstatus character varying(100),
    centroid jsonb,
    geom text,
    raw_entity jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scraped_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.govmap_plans_rami OWNER TO postgres;

--
-- Name: TABLE govmap_plans_rami; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.govmap_plans_rami IS 'טבלה לשמירת נתוני תוכניות בעבודה והכנה-רמ"י מ-GovMap API';


--
-- Name: COLUMN govmap_plans_rami.object_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.object_id IS 'מזהה ייחודי של התוכנית מ-GovMap';


--
-- Name: COLUMN govmap_plans_rami.tochnit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.tochnit IS 'מספר/שם תכנית';


--
-- Name: COLUMN govmap_plans_rami.prjname; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.prjname IS 'שם הפרויקט';


--
-- Name: COLUMN govmap_plans_rami.statustochnit; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.statustochnit IS 'סטטוס התכנית (בהכנה, בעבודה וכו)';


--
-- Name: COLUMN govmap_plans_rami.ishuvim; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.ishuvim IS 'רשימת ישובים';


--
-- Name: COLUMN govmap_plans_rami.yazam; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.yazam IS 'יזם הפרויקט';


--
-- Name: COLUMN govmap_plans_rami.yeudikari; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.yeudikari IS 'יעוד עיקרי';


--
-- Name: COLUMN govmap_plans_rami.ydmelay; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.ydmelay IS 'מלאי יחידות דיור';


--
-- Name: COLUMN govmap_plans_rami.merchavrmi; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.merchavrmi IS 'מספר מרחב';


--
-- Name: COLUMN govmap_plans_rami.prjstatus; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.prjstatus IS 'סטטוס הפרויקט';


--
-- Name: COLUMN govmap_plans_rami.centroid; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.centroid IS 'נקודת מרכז התוכנית (קואורדינטות)';


--
-- Name: COLUMN govmap_plans_rami.geom; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.geom IS 'גיאומטריה של התוכנית (MULTIPOLYGON)';


--
-- Name: COLUMN govmap_plans_rami.raw_entity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.govmap_plans_rami.raw_entity IS 'נתונים גולמיים מהתגובה של GovMap';


--
-- Name: govmap_plans_rami_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.govmap_plans_rami_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.govmap_plans_rami_id_seq OWNER TO postgres;

--
-- Name: govmap_plans_rami_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.govmap_plans_rami_id_seq OWNED BY public.govmap_plans_rami.id;


--
-- Name: govmap_talar_prep; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_talar_prep (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    object_id integer,
    geom text,
    centroid jsonb,
    fields jsonb,
    raw_entity jsonb
);


ALTER TABLE public.govmap_talar_prep OWNER TO postgres;

--
-- Name: govmap_talar_prep_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.govmap_talar_prep_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.govmap_talar_prep_id_seq OWNER TO postgres;

--
-- Name: govmap_talar_prep_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.govmap_talar_prep_id_seq OWNED BY public.govmap_talar_prep.id;


--
-- Name: govmap_urban_renewal_compounds; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.govmap_urban_renewal_compounds (
    object_id integer NOT NULL,
    caption text,
    heara text,
    kishur text,
    source text,
    project_name text,
    city_name text,
    city_code integer,
    neighborhood_name text,
    status text,
    approval_stage text,
    housing_units integer,
    planned_units integer,
    executing_body text,
    last_update date,
    remarks text,
    centroid public.geometry(Point,2039),
    geom public.geometry(MultiPolygon,2039)
);


ALTER TABLE public.govmap_urban_renewal_compounds OWNER TO postgres;

--
-- Name: industrial_lots_development_areas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.industrial_lots_development_areas (
    id bigint NOT NULL,
    govmap_object_id bigint NOT NULL,
    layer_name text NOT NULL,
    lotnum text,
    cdpnum text,
    size_m2 numeric,
    ipnameheb text,
    ipactive boolean,
    lotidstring text,
    cdpidstring text,
    disclaimerheb text,
    disclaimereng text,
    disclaimerarab text,
    gisstatusheb text,
    gisstatuseng text,
    gisstatusarab text,
    landdesignationassignment text,
    centroid_geom public.geometry,
    geom public.geometry,
    raw_entity jsonb,
    scraped_at timestamp with time zone
);


ALTER TABLE public.industrial_lots_development_areas OWNER TO postgres;

--
-- Name: industrial_lots_development_areas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.industrial_lots_development_areas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.industrial_lots_development_areas_id_seq OWNER TO postgres;

--
-- Name: industrial_lots_development_areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.industrial_lots_development_areas_id_seq OWNED BY public.industrial_lots_development_areas.id;


--
-- Name: karkarank_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.karkarank_categories (
    pk bigint NOT NULL,
    wp_id bigint NOT NULL,
    name text,
    slug text,
    parent_id bigint,
    count integer,
    description text,
    fetched_at timestamp with time zone DEFAULT now(),
    raw jsonb NOT NULL
);


ALTER TABLE public.karkarank_categories OWNER TO postgres;

--
-- Name: karkarank_categories_pk_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.karkarank_categories ALTER COLUMN pk ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.karkarank_categories_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: karkarank_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.karkarank_comments (
    pk bigint NOT NULL,
    wp_id bigint NOT NULL,
    post_id bigint,
    parent_id bigint,
    author_name text,
    author_email text,
    author_url text,
    link text,
    status text,
    date_gmt timestamp with time zone,
    fetched_at timestamp with time zone DEFAULT now(),
    content text,
    raw jsonb NOT NULL
);


ALTER TABLE public.karkarank_comments OWNER TO postgres;

--
-- Name: karkarank_comments_pk_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.karkarank_comments ALTER COLUMN pk ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.karkarank_comments_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: karkarank_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.karkarank_posts (
    pk bigint NOT NULL,
    wp_id bigint NOT NULL,
    slug text,
    title text,
    status text,
    author_id bigint,
    link text,
    date_gmt timestamp with time zone,
    modified_gmt timestamp with time zone,
    categories bigint[],
    tags bigint[],
    comment_status text,
    ping_status text,
    fetched_at timestamp with time zone DEFAULT now(),
    raw jsonb NOT NULL
);


ALTER TABLE public.karkarank_posts OWNER TO postgres;

--
-- Name: karkarank_posts_pk_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.karkarank_posts ALTER COLUMN pk ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.karkarank_posts_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: land_use_mavat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.land_use_mavat (
    id bigint NOT NULL,
    govmap_object_id bigint NOT NULL,
    layer_name text NOT NULL,
    mavat_code integer,
    mavat_name text,
    pl_id bigint,
    pl_number text,
    pl_name text,
    station_desc text,
    last_update_date timestamp with time zone,
    defq text,
    source_code text,
    area numeric,
    len numeric,
    centroid_geom public.geometry,
    geom public.geometry,
    raw_entity jsonb,
    scraped_at timestamp with time zone
);


ALTER TABLE public.land_use_mavat OWNER TO postgres;

--
-- Name: land_use_mavat_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.land_use_mavat_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.land_use_mavat_id_seq OWNER TO postgres;

--
-- Name: land_use_mavat_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.land_use_mavat_id_seq OWNED BY public.land_use_mavat.id;


--
-- Name: meirim_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meirim_plans (
    id integer NOT NULL,
    meirim_id integer NOT NULL,
    plan_number character varying(255),
    plan_name text,
    plan_display_name text,
    county_name character varying(255),
    plan_character_name character varying(255),
    status character varying(255),
    goals_from_mavat text,
    main_details_from_mavat text,
    geometry jsonb,
    object_id integer,
    entity_subtype_desc character varying(255),
    plan_url text,
    mp_id bigint,
    plan_new_mavat_url text,
    tags jsonb,
    updated_at timestamp with time zone,
    scraped_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.meirim_plans OWNER TO postgres;

--
-- Name: TABLE meirim_plans; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.meirim_plans IS 'טבלה לשמירת נתוני תוכניות בנייה מ-meirim.org';


--
-- Name: COLUMN meirim_plans.meirim_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.meirim_plans.meirim_id IS 'מזהה ייחודי של התוכנית ב-meirim';


--
-- Name: COLUMN meirim_plans.plan_number; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.meirim_plans.plan_number IS 'מספר התוכנית';


--
-- Name: COLUMN meirim_plans.plan_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.meirim_plans.plan_name IS 'שם התוכנית';


--
-- Name: COLUMN meirim_plans.county_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.meirim_plans.county_name IS 'שם המחוז';


--
-- Name: COLUMN meirim_plans.geometry; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.meirim_plans.geometry IS 'גיאומטריה של התוכנית (GeoJSON)';


--
-- Name: COLUMN meirim_plans.plan_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.meirim_plans.plan_url IS 'קישור לתוכנית במערכת mavat';


--
-- Name: meirim_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.meirim_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.meirim_plans_id_seq OWNER TO postgres;

--
-- Name: meirim_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meirim_plans_id_seq OWNED BY public.meirim_plans.id;


--
-- Name: michrazim; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.michrazim (
    pk bigint NOT NULL,
    michraz_id bigint,
    tender_id bigint,
    tender_number text,
    title text,
    status text,
    area text,
    publication_date timestamp with time zone,
    deadline_date timestamp with time zone,
    source_endpoint text,
    fetched_at timestamp with time zone DEFAULT now(),
    raw jsonb NOT NULL
);


ALTER TABLE public.michrazim OWNER TO postgres;

--
-- Name: michrazim_active; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.michrazim_active (
    pk bigint NOT NULL,
    michraz_id bigint NOT NULL,
    active_since timestamp with time zone DEFAULT now(),
    last_seen_at timestamp with time zone DEFAULT now(),
    source_endpoint text,
    raw jsonb NOT NULL
);


ALTER TABLE public.michrazim_active OWNER TO postgres;

--
-- Name: michrazim_active_pk_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.michrazim_active ALTER COLUMN pk ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.michrazim_active_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: michrazim_pk_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.michrazim ALTER COLUMN pk ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.michrazim_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: mitchamim_rashut; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mitchamim_rashut (
    id integer NOT NULL,
    mitcham_id character varying(255) NOT NULL,
    mitcham_name text,
    city_name character varying(255),
    region_name character varying(255),
    district character varying(255),
    status character varying(255),
    program_type character varying(255),
    renewal_type character varying(255),
    approval_date date,
    start_date date,
    end_date date,
    area_size numeric(10,2),
    units_count integer,
    developer_name character varying(255),
    budget numeric(15,2),
    ministry_project character varying(255),
    remarks text,
    location_coordinates jsonb,
    additional_data jsonb,
    source_url text,
    updated_at timestamp with time zone DEFAULT now(),
    scraped_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    execution_status character varying(255),
    plan_number character varying(255),
    plan_url text,
    map_url text
);


ALTER TABLE public.mitchamim_rashut OWNER TO postgres;

--
-- Name: TABLE mitchamim_rashut; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.mitchamim_rashut IS 'טבלה לשמירת נתוני מתחמים בהתחדשות עירונית ממשרד הבינוי והשיכון';


--
-- Name: COLUMN mitchamim_rashut.mitcham_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mitchamim_rashut.mitcham_id IS 'מזהה ייחודי של המתחם';


--
-- Name: COLUMN mitchamim_rashut.mitcham_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mitchamim_rashut.mitcham_name IS 'שם המתחם';


--
-- Name: COLUMN mitchamim_rashut.city_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mitchamim_rashut.city_name IS 'שם העיר';


--
-- Name: COLUMN mitchamim_rashut.program_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mitchamim_rashut.program_type IS 'סוג התוכנית';


--
-- Name: COLUMN mitchamim_rashut.renewal_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mitchamim_rashut.renewal_type IS 'סוג ההתחדשות (הריסה ובנייה/פינוי בינוי וכו)';


--
-- Name: COLUMN mitchamim_rashut.area_size; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mitchamim_rashut.area_size IS 'גודל המתחם במ״ר';


--
-- Name: COLUMN mitchamim_rashut.units_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mitchamim_rashut.units_count IS 'מספר יחידות דיור';


--
-- Name: COLUMN mitchamim_rashut.location_coordinates; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.mitchamim_rashut.location_coordinates IS 'קואורדינטות של המתחם (GeoJSON)';


--
-- Name: mitchamim_rashut_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mitchamim_rashut_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mitchamim_rashut_id_seq OWNER TO postgres;

--
-- Name: mitchamim_rashut_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mitchamim_rashut_id_seq OWNED BY public.mitchamim_rashut.id;


--
-- Name: msbs_lots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.msbs_lots (
    object_id integer NOT NULL,
    lot_id integer,
    mis_toc integer,
    land_use_code integer,
    land_use_old_code integer,
    land_use_name text,
    lot_number integer,
    marketing_block_id integer,
    parking_spaces integer,
    road_width_m numeric(12,2),
    road_rights_left numeric(12,2),
    road_rights_right numeric(12,2),
    housing_units integer,
    commerce_area_sqm numeric(12,2),
    services_area_sqm numeric(12,2),
    building_count integer,
    building_height_m numeric(12,2),
    floor_count integer,
    floor_below_zero integer,
    data_entry_date date,
    data_source_type integer,
    centroid public.geometry(Point,2039),
    geom public.geometry(MultiPolygon,2039),
    raw_properties jsonb,
    inserted_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.msbs_lots OWNER TO postgres;

--
-- Name: nadlan_jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nadlan_jobs (
    id text NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    result jsonb,
    error text,
    CONSTRAINT nadlan_jobs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'done'::text, 'error'::text])))
);


ALTER TABLE public.nadlan_jobs OWNER TO postgres;

--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_preferences (
    user_id uuid NOT NULL,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notification_preferences OWNER TO postgres;

--
-- Name: parcel_ownership_new; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parcel_ownership_new (
    id bigint NOT NULL,
    govmap_object_id bigint NOT NULL,
    layer_name text NOT NULL,
    gush_num integer NOT NULL,
    gush_suffi integer NOT NULL,
    parcel integer NOT NULL,
    legal_area_m2 numeric,
    ownership_type text NOT NULL,
    remark text,
    doc_url text,
    centroid_geom public.geometry(Point,2039),
    geom public.geometry(MultiPolygon,2039),
    raw_entity jsonb,
    scraped_at timestamp with time zone
);


ALTER TABLE public.parcel_ownership_new OWNER TO postgres;

--
-- Name: parcel_ownership_new_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.parcel_ownership_new_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.parcel_ownership_new_id_seq OWNER TO postgres;

--
-- Name: parcel_ownership_new_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.parcel_ownership_new_id_seq OWNED BY public.parcel_ownership_new.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: portfolio_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.portfolio_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    item_type text NOT NULL,
    source_id text NOT NULL,
    snapshot jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.portfolio_items OWNER TO postgres;

--
-- Name: purchase_tax_adjustments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_tax_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_version_id uuid NOT NULL,
    code text NOT NULL,
    label_he text NOT NULL,
    adjustment_type text NOT NULL,
    value numeric,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL
);


ALTER TABLE public.purchase_tax_adjustments OWNER TO postgres;

--
-- Name: purchase_tax_brackets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchase_tax_brackets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_version_id uuid NOT NULL,
    buyer_category text NOT NULL,
    min_amount numeric DEFAULT 0 NOT NULL,
    max_amount numeric,
    rate numeric NOT NULL,
    fixed_amount numeric,
    sort_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.purchase_tax_brackets OWNER TO postgres;

--
-- Name: saved_calculations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.saved_calculations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    calculator_type text NOT NULL,
    input_payload jsonb NOT NULL,
    result_payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.saved_calculations OWNER TO postgres;

--
-- Name: taba_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taba_plans (
    pk bigint NOT NULL,
    plan_id bigint,
    id bigint,
    plan_number text,
    plan_name text,
    status text,
    area text,
    publication_date timestamp with time zone,
    from_date timestamp with time zone,
    to_date timestamp with time zone,
    source_endpoint text,
    fetched_at timestamp with time zone DEFAULT now(),
    raw jsonb NOT NULL
);


ALTER TABLE public.taba_plans OWNER TO postgres;

--
-- Name: taba_plans_all_pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taba_plans_all_pages (
    id integer NOT NULL,
    plan_id character varying(255) NOT NULL,
    plan_number character varying(255),
    plan_name text,
    status character varying(255),
    area character varying(255),
    publication_date timestamp with time zone,
    source_endpoint text,
    raw jsonb,
    page_number integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.taba_plans_all_pages OWNER TO postgres;

--
-- Name: taba_plans_all_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.taba_plans_all_pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.taba_plans_all_pages_id_seq OWNER TO postgres;

--
-- Name: taba_plans_all_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.taba_plans_all_pages_id_seq OWNED BY public.taba_plans_all_pages.id;


--
-- Name: taba_plans_page_1; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taba_plans_page_1 (
    id integer NOT NULL,
    plan_id character varying(255) NOT NULL,
    plan_number character varying(255),
    plan_name text,
    status character varying(255),
    area character varying(255),
    publication_date timestamp with time zone,
    source_endpoint text,
    raw jsonb,
    page_number integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.taba_plans_page_1 OWNER TO postgres;

--
-- Name: taba_plans_page_1_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.taba_plans_page_1_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.taba_plans_page_1_id_seq OWNER TO postgres;

--
-- Name: taba_plans_page_1_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.taba_plans_page_1_id_seq OWNED BY public.taba_plans_page_1.id;


--
-- Name: taba_plans_page_2; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taba_plans_page_2 (
    id integer NOT NULL,
    plan_id character varying(255) NOT NULL,
    plan_number character varying(255),
    plan_name text,
    status character varying(255),
    area character varying(255),
    publication_date timestamp with time zone,
    source_endpoint text,
    raw jsonb,
    page_number integer DEFAULT 2,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.taba_plans_page_2 OWNER TO postgres;

--
-- Name: taba_plans_page_2_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.taba_plans_page_2_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.taba_plans_page_2_id_seq OWNER TO postgres;

--
-- Name: taba_plans_page_2_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.taba_plans_page_2_id_seq OWNED BY public.taba_plans_page_2.id;


--
-- Name: taba_plans_page_3; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.taba_plans_page_3 (
    id integer NOT NULL,
    plan_id character varying(255) NOT NULL,
    plan_number character varying(255),
    plan_name text,
    status character varying(255),
    area character varying(255),
    publication_date timestamp with time zone,
    source_endpoint text,
    raw jsonb,
    page_number integer DEFAULT 3,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.taba_plans_page_3 OWNER TO postgres;

--
-- Name: taba_plans_page_3_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.taba_plans_page_3_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.taba_plans_page_3_id_seq OWNER TO postgres;

--
-- Name: taba_plans_page_3_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.taba_plans_page_3_id_seq OWNED BY public.taba_plans_page_3.id;


--
-- Name: taba_plans_pk_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.taba_plans ALTER COLUMN pk ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.taba_plans_pk_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: tama70_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tama70_plans (
    id bigint NOT NULL,
    govmap_object_id bigint NOT NULL,
    layer_name text NOT NULL,
    plan_number text NOT NULL,
    plan_name text NOT NULL,
    last_update_raw text,
    link_url text,
    centroid_geom public.geometry,
    geom public.geometry,
    raw_entity jsonb,
    scraped_at timestamp with time zone
);


ALTER TABLE public.tama70_plans OWNER TO postgres;

--
-- Name: tama70_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tama70_plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tama70_plans_id_seq OWNER TO postgres;

--
-- Name: tama70_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tama70_plans_id_seq OWNED BY public.tama70_plans.id;


--
-- Name: tax_rule_versions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tax_rule_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tax_type text NOT NULL,
    version_name text NOT NULL,
    effective_from date NOT NULL,
    effective_to date,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tax_rule_versions_tax_type_check CHECK ((tax_type = ANY (ARRAY['purchase'::text, 'capital_gains'::text])))
);


ALTER TABLE public.tax_rule_versions OWNER TO postgres;

--
-- Name: telegram_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telegram_documents (
    id bigint NOT NULL,
    telegram_message_id bigint,
    telegram_chat_id bigint,
    telegram_date timestamp with time zone,
    image_file_id text,
    image_url text,
    raw_ocr_text text,
    document_type text,
    location_city text,
    location_address text,
    property_type text,
    property_floors integer,
    property_units integer,
    total_area_sqm numeric,
    building_area_sqm numeric,
    apartments jsonb,
    sale_conditions text,
    submission_deadline date,
    deposit_amount numeric,
    deposit_currency text,
    contact_name text,
    contact_title text,
    contact_address text,
    contact_phone text,
    contact_fax text,
    contact_email text,
    court_file_number text,
    parcel_number text,
    block_number text,
    extracted_data jsonb,
    processed_at timestamp with time zone DEFAULT now(),
    processing_status text DEFAULT 'pending'::text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.telegram_documents OWNER TO postgres;

--
-- Name: telegram_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.telegram_documents_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.telegram_documents_id_seq OWNER TO postgres;

--
-- Name: telegram_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.telegram_documents_id_seq OWNED BY public.telegram_documents.id;


--
-- Name: urban_renewal_cities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.urban_renewal_cities (
    id integer NOT NULL,
    object_id integer,
    city_id integer,
    city_name character varying(100),
    mitcham_count integer DEFAULT 0,
    mitcham_existing_housing_units integer DEFAULT 0,
    mitcham_proposed_housing_units integer DEFAULT 0,
    mitcham_new_housing_units integer DEFAULT 0,
    tama38_count integer DEFAULT 0,
    link text,
    phone_number character varying(50),
    email character varying(255),
    symbol_type integer,
    shape_area numeric,
    shape_length numeric,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.urban_renewal_cities OWNER TO postgres;

--
-- Name: urban_renewal_cities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.urban_renewal_cities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.urban_renewal_cities_id_seq OWNER TO postgres;

--
-- Name: urban_renewal_cities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.urban_renewal_cities_id_seq OWNED BY public.urban_renewal_cities.id;


--
-- Name: urban_renewal_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.urban_renewal_locations (
    id integer NOT NULL,
    object_id integer,
    layer_id integer,
    geometry_type character varying(50),
    coordinates jsonb,
    shape_area numeric,
    shape_length numeric,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.urban_renewal_locations OWNER TO postgres;

--
-- Name: urban_renewal_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.urban_renewal_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.urban_renewal_locations_id_seq OWNER TO postgres;

--
-- Name: urban_renewal_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.urban_renewal_locations_id_seq OWNED BY public.urban_renewal_locations.id;


--
-- Name: urban_renewal_mitchamim_rashut; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.urban_renewal_mitchamim_rashut (
    id bigint NOT NULL,
    mispar_mitham integer NOT NULL,
    yeshuv text,
    semel_yeshuv integer,
    shem_mitcham text,
    yachad_kayam integer,
    yachad_tosafti integer,
    yachad_mutza integer,
    taarich_hachraza date,
    mispar_tochnit text,
    kishur_latar text,
    kishur_la_mapa text,
    sach_heterim integer,
    maslul text,
    shnat_matan_tokef integer,
    bebitzua text,
    status text,
    imported_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.urban_renewal_mitchamim_rashut OWNER TO postgres;

--
-- Name: urban_renewal_mitchamim_rashut_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.urban_renewal_mitchamim_rashut_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.urban_renewal_mitchamim_rashut_id_seq OWNER TO postgres;

--
-- Name: urban_renewal_mitchamim_rashut_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.urban_renewal_mitchamim_rashut_id_seq OWNED BY public.urban_renewal_mitchamim_rashut.id;


--
-- Name: urban_renewal_projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.urban_renewal_projects (
    id integer NOT NULL,
    object_id integer,
    project_number character varying(50),
    project_name character varying(255),
    city_name character varying(100),
    plan_name character varying(255),
    plan_link text,
    project_type character varying(100),
    project_subtype character varying(100),
    status_code integer,
    authority_status_code integer,
    valid_date timestamp without time zone,
    existing_units integer,
    proposed_units integer,
    additional_units integer,
    notes text,
    shape_area numeric,
    shape_length numeric,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.urban_renewal_projects OWNER TO postgres;

--
-- Name: urban_renewal_projects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.urban_renewal_projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.urban_renewal_projects_id_seq OWNER TO postgres;

--
-- Name: urban_renewal_projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.urban_renewal_projects_id_seq OWNED BY public.urban_renewal_projects.id;


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notification_preferences (
    user_id uuid NOT NULL,
    notify_urban_renewal_new boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notify_dangerous_buildings_new boolean DEFAULT false NOT NULL
);


ALTER TABLE public.user_notification_preferences OWNER TO postgres;

--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    link text,
    read_at timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_notifications OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: xplan_features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.xplan_features (
    id bigint NOT NULL,
    layer_id integer NOT NULL,
    feature_objectid bigint,
    plan_id text,
    plan_name text,
    plan_type text,
    plan_status text,
    plan_stage text,
    district text,
    municipality text,
    area_dunam numeric,
    submission_date date,
    approval_date date,
    data_source text DEFAULT 'xplan_without_77_78'::text,
    geometry public.geometry(MultiPolygon,4326) NOT NULL,
    raw_attributes jsonb NOT NULL,
    source_bbox public.geometry(Polygon,4326),
    inserted_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.xplan_features OWNER TO postgres;

--
-- Name: xplan_features_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.xplan_features_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.xplan_features_id_seq OWNER TO postgres;

--
-- Name: xplan_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.xplan_features_id_seq OWNED BY public.xplan_features.id;


--
-- Name: address_price_trends id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_price_trends ALTER COLUMN id SET DEFAULT nextval('public.address_price_trends_id_seq'::regclass);


--
-- Name: construction_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.construction_progress ALTER COLUMN id SET DEFAULT nextval('public.construction_progress_id_seq'::regclass);


--
-- Name: dangerous_buildings_active id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dangerous_buildings_active ALTER COLUMN id SET DEFAULT nextval('public.dangerous_buildings_active_id_seq'::regclass);


--
-- Name: govmap_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_data ALTER COLUMN id SET DEFAULT nextval('public.govmap_data_id_seq'::regclass);


--
-- Name: govmap_deals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_deals ALTER COLUMN id SET DEFAULT nextval('public.govmap_deals_id_seq'::regclass);


--
-- Name: govmap_gushim id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_gushim ALTER COLUMN id SET DEFAULT nextval('public.govmap_gushim_id_seq'::regclass);


--
-- Name: govmap_gushim_by_search id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_gushim_by_search ALTER COLUMN id SET DEFAULT nextval('public.govmap_gushim_by_search_id_seq'::regclass);


--
-- Name: govmap_gushim_parcels_by_search id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_gushim_parcels_by_search ALTER COLUMN id SET DEFAULT nextval('public.govmap_gushim_parcels_by_search_id_seq'::regclass);


--
-- Name: govmap_parcels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_parcels ALTER COLUMN id SET DEFAULT nextval('public.govmap_parcels_id_seq'::regclass);


--
-- Name: govmap_parcels_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_parcels_data ALTER COLUMN id SET DEFAULT nextval('public.govmap_parcels_data_id_seq'::regclass);


--
-- Name: govmap_plans_rami id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_plans_rami ALTER COLUMN id SET DEFAULT nextval('public.govmap_plans_rami_id_seq'::regclass);


--
-- Name: govmap_talar_prep id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_talar_prep ALTER COLUMN id SET DEFAULT nextval('public.govmap_talar_prep_id_seq'::regclass);


--
-- Name: industrial_lots_development_areas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.industrial_lots_development_areas ALTER COLUMN id SET DEFAULT nextval('public.industrial_lots_development_areas_id_seq'::regclass);


--
-- Name: land_use_mavat id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.land_use_mavat ALTER COLUMN id SET DEFAULT nextval('public.land_use_mavat_id_seq'::regclass);


--
-- Name: meirim_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meirim_plans ALTER COLUMN id SET DEFAULT nextval('public.meirim_plans_id_seq'::regclass);


--
-- Name: mitchamim_rashut id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitchamim_rashut ALTER COLUMN id SET DEFAULT nextval('public.mitchamim_rashut_id_seq'::regclass);


--
-- Name: parcel_ownership_new id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_ownership_new ALTER COLUMN id SET DEFAULT nextval('public.parcel_ownership_new_id_seq'::regclass);


--
-- Name: taba_plans_all_pages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_all_pages ALTER COLUMN id SET DEFAULT nextval('public.taba_plans_all_pages_id_seq'::regclass);


--
-- Name: taba_plans_page_1 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_page_1 ALTER COLUMN id SET DEFAULT nextval('public.taba_plans_page_1_id_seq'::regclass);


--
-- Name: taba_plans_page_2 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_page_2 ALTER COLUMN id SET DEFAULT nextval('public.taba_plans_page_2_id_seq'::regclass);


--
-- Name: taba_plans_page_3 id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_page_3 ALTER COLUMN id SET DEFAULT nextval('public.taba_plans_page_3_id_seq'::regclass);


--
-- Name: tama70_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tama70_plans ALTER COLUMN id SET DEFAULT nextval('public.tama70_plans_id_seq'::regclass);


--
-- Name: telegram_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_documents ALTER COLUMN id SET DEFAULT nextval('public.telegram_documents_id_seq'::regclass);


--
-- Name: urban_renewal_cities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_cities ALTER COLUMN id SET DEFAULT nextval('public.urban_renewal_cities_id_seq'::regclass);


--
-- Name: urban_renewal_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_locations ALTER COLUMN id SET DEFAULT nextval('public.urban_renewal_locations_id_seq'::regclass);


--
-- Name: urban_renewal_mitchamim_rashut id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_mitchamim_rashut ALTER COLUMN id SET DEFAULT nextval('public.urban_renewal_mitchamim_rashut_id_seq'::regclass);


--
-- Name: urban_renewal_projects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_projects ALTER COLUMN id SET DEFAULT nextval('public.urban_renewal_projects_id_seq'::regclass);


--
-- Name: xplan_features id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.xplan_features ALTER COLUMN id SET DEFAULT nextval('public.xplan_features_id_seq'::regclass);


--
-- Name: address_price_trends address_price_trends_address_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_price_trends
    ADD CONSTRAINT address_price_trends_address_id_key UNIQUE (address_id);


--
-- Name: address_price_trends address_price_trends_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_price_trends
    ADD CONSTRAINT address_price_trends_pkey PRIMARY KEY (id);


--
-- Name: api_snapshots api_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_snapshots
    ADD CONSTRAINT api_snapshots_pkey PRIMARY KEY (id);


--
-- Name: api_snapshots api_snapshots_source_type_source_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_snapshots
    ADD CONSTRAINT api_snapshots_source_type_source_id_key UNIQUE (source_type, source_id);


--
-- Name: app_data_snapshots app_data_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_data_snapshots
    ADD CONSTRAINT app_data_snapshots_pkey PRIMARY KEY (snapshot_key);


--
-- Name: calculation_logs calculation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calculation_logs
    ADD CONSTRAINT calculation_logs_pkey PRIMARY KEY (id);


--
-- Name: capital_gains_rules capital_gains_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capital_gains_rules
    ADD CONSTRAINT capital_gains_rules_pkey PRIMARY KEY (id);


--
-- Name: capital_gains_rules capital_gains_rules_rule_version_id_asset_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capital_gains_rules
    ADD CONSTRAINT capital_gains_rules_rule_version_id_asset_type_key UNIQUE (rule_version_id, asset_type);


--
-- Name: construction_progress construction_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.construction_progress
    ADD CONSTRAINT construction_progress_pkey PRIMARY KEY (id);


--
-- Name: contact_submissions contact_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_submissions
    ADD CONSTRAINT contact_submissions_pkey PRIMARY KEY (id);


--
-- Name: dangerous_buildings_active dangerous_buildings_active_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dangerous_buildings_active
    ADD CONSTRAINT dangerous_buildings_active_pkey PRIMARY KEY (id);


--
-- Name: dangerous_buildings_active dangerous_buildings_active_treatment_file_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.dangerous_buildings_active
    ADD CONSTRAINT dangerous_buildings_active_treatment_file_key UNIQUE (treatment_file);


--
-- Name: deals deals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deals
    ADD CONSTRAINT deals_pkey PRIMARY KEY (id);


--
-- Name: featured_professionals featured_professionals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.featured_professionals
    ADD CONSTRAINT featured_professionals_pkey PRIMARY KEY (id);


--
-- Name: govmap_data govmap_data_govmap_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_data
    ADD CONSTRAINT govmap_data_govmap_id_key UNIQUE (govmap_id);


--
-- Name: govmap_data govmap_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_data
    ADD CONSTRAINT govmap_data_pkey PRIMARY KEY (id);


--
-- Name: govmap_deals govmap_deals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_deals
    ADD CONSTRAINT govmap_deals_pkey PRIMARY KEY (id);


--
-- Name: govmap_gushim_by_search govmap_gushim_by_search_govmap_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_gushim_by_search
    ADD CONSTRAINT govmap_gushim_by_search_govmap_object_id_key UNIQUE (govmap_object_id);


--
-- Name: govmap_gushim_by_search govmap_gushim_by_search_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_gushim_by_search
    ADD CONSTRAINT govmap_gushim_by_search_pkey PRIMARY KEY (id);


--
-- Name: govmap_gushim govmap_gushim_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_gushim
    ADD CONSTRAINT govmap_gushim_object_id_key UNIQUE (object_id);


--
-- Name: govmap_gushim_parcels_by_search govmap_gushim_parcels_by_search_govmap_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_gushim_parcels_by_search
    ADD CONSTRAINT govmap_gushim_parcels_by_search_govmap_object_id_key UNIQUE (govmap_object_id);


--
-- Name: govmap_gushim_parcels_by_search govmap_gushim_parcels_by_search_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_gushim_parcels_by_search
    ADD CONSTRAINT govmap_gushim_parcels_by_search_pkey PRIMARY KEY (id);


--
-- Name: govmap_gushim govmap_gushim_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_gushim
    ADD CONSTRAINT govmap_gushim_pkey PRIMARY KEY (id);


--
-- Name: govmap_parcels_data govmap_parcels_data_objectid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_parcels_data
    ADD CONSTRAINT govmap_parcels_data_objectid_key UNIQUE (objectid);


--
-- Name: govmap_parcels_data govmap_parcels_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_parcels_data
    ADD CONSTRAINT govmap_parcels_data_pkey PRIMARY KEY (id);


--
-- Name: govmap_parcels govmap_parcels_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_parcels
    ADD CONSTRAINT govmap_parcels_object_id_key UNIQUE (object_id);


--
-- Name: govmap_parcels govmap_parcels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_parcels
    ADD CONSTRAINT govmap_parcels_pkey PRIMARY KEY (id);


--
-- Name: govmap_plans govmap_plans_objectid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_plans
    ADD CONSTRAINT govmap_plans_objectid_key UNIQUE (objectid);


--
-- Name: govmap_plans govmap_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_plans
    ADD CONSTRAINT govmap_plans_pkey PRIMARY KEY (pk);


--
-- Name: govmap_plans_rami govmap_plans_rami_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_plans_rami
    ADD CONSTRAINT govmap_plans_rami_object_id_key UNIQUE (object_id);


--
-- Name: govmap_plans_rami govmap_plans_rami_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_plans_rami
    ADD CONSTRAINT govmap_plans_rami_pkey PRIMARY KEY (id);


--
-- Name: govmap_talar_prep govmap_talar_prep_object_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_talar_prep
    ADD CONSTRAINT govmap_talar_prep_object_id_unique UNIQUE (object_id);


--
-- Name: govmap_talar_prep govmap_talar_prep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_talar_prep
    ADD CONSTRAINT govmap_talar_prep_pkey PRIMARY KEY (id);


--
-- Name: govmap_urban_renewal_compounds govmap_urban_renewal_compounds_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.govmap_urban_renewal_compounds
    ADD CONSTRAINT govmap_urban_renewal_compounds_pkey PRIMARY KEY (object_id);


--
-- Name: industrial_lots_development_areas industrial_lots_development_areas_govmap_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.industrial_lots_development_areas
    ADD CONSTRAINT industrial_lots_development_areas_govmap_object_id_key UNIQUE (govmap_object_id);


--
-- Name: industrial_lots_development_areas industrial_lots_development_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.industrial_lots_development_areas
    ADD CONSTRAINT industrial_lots_development_areas_pkey PRIMARY KEY (id);


--
-- Name: karkarank_categories karkarank_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.karkarank_categories
    ADD CONSTRAINT karkarank_categories_pkey PRIMARY KEY (pk);


--
-- Name: karkarank_categories karkarank_categories_wp_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.karkarank_categories
    ADD CONSTRAINT karkarank_categories_wp_id_key UNIQUE (wp_id);


--
-- Name: karkarank_comments karkarank_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.karkarank_comments
    ADD CONSTRAINT karkarank_comments_pkey PRIMARY KEY (pk);


--
-- Name: karkarank_comments karkarank_comments_wp_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.karkarank_comments
    ADD CONSTRAINT karkarank_comments_wp_id_key UNIQUE (wp_id);


--
-- Name: karkarank_posts karkarank_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.karkarank_posts
    ADD CONSTRAINT karkarank_posts_pkey PRIMARY KEY (pk);


--
-- Name: karkarank_posts karkarank_posts_wp_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.karkarank_posts
    ADD CONSTRAINT karkarank_posts_wp_id_key UNIQUE (wp_id);


--
-- Name: land_use_mavat land_use_mavat_govmap_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.land_use_mavat
    ADD CONSTRAINT land_use_mavat_govmap_object_id_key UNIQUE (govmap_object_id);


--
-- Name: land_use_mavat land_use_mavat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.land_use_mavat
    ADD CONSTRAINT land_use_mavat_pkey PRIMARY KEY (id);


--
-- Name: meirim_plans meirim_plans_meirim_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meirim_plans
    ADD CONSTRAINT meirim_plans_meirim_id_key UNIQUE (meirim_id);


--
-- Name: meirim_plans meirim_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meirim_plans
    ADD CONSTRAINT meirim_plans_pkey PRIMARY KEY (id);


--
-- Name: michrazim_active michrazim_active_michraz_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.michrazim_active
    ADD CONSTRAINT michrazim_active_michraz_id_key UNIQUE (michraz_id);


--
-- Name: michrazim_active michrazim_active_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.michrazim_active
    ADD CONSTRAINT michrazim_active_pkey PRIMARY KEY (pk);


--
-- Name: michrazim michrazim_michraz_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.michrazim
    ADD CONSTRAINT michrazim_michraz_id_key UNIQUE (michraz_id);


--
-- Name: michrazim michrazim_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.michrazim
    ADD CONSTRAINT michrazim_pkey PRIMARY KEY (pk);


--
-- Name: michrazim michrazim_tender_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.michrazim
    ADD CONSTRAINT michrazim_tender_id_key UNIQUE (tender_id);


--
-- Name: michrazim michrazim_tender_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.michrazim
    ADD CONSTRAINT michrazim_tender_number_key UNIQUE (tender_number);


--
-- Name: mitchamim_rashut mitchamim_rashut_mitcham_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitchamim_rashut
    ADD CONSTRAINT mitchamim_rashut_mitcham_id_key UNIQUE (mitcham_id);


--
-- Name: mitchamim_rashut mitchamim_rashut_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mitchamim_rashut
    ADD CONSTRAINT mitchamim_rashut_pkey PRIMARY KEY (id);


--
-- Name: msbs_lots msbs_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.msbs_lots
    ADD CONSTRAINT msbs_lots_pkey PRIMARY KEY (object_id);


--
-- Name: nadlan_jobs nadlan_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nadlan_jobs
    ADD CONSTRAINT nadlan_jobs_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: parcel_ownership_new parcel_ownership_new_govmap_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_ownership_new
    ADD CONSTRAINT parcel_ownership_new_govmap_object_id_key UNIQUE (govmap_object_id);


--
-- Name: parcel_ownership_new parcel_ownership_new_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parcel_ownership_new
    ADD CONSTRAINT parcel_ownership_new_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: portfolio_items portfolio_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_pkey PRIMARY KEY (id);


--
-- Name: portfolio_items portfolio_items_user_id_item_type_source_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_user_id_item_type_source_id_key UNIQUE (user_id, item_type, source_id);


--
-- Name: purchase_tax_adjustments purchase_tax_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_tax_adjustments
    ADD CONSTRAINT purchase_tax_adjustments_pkey PRIMARY KEY (id);


--
-- Name: purchase_tax_adjustments purchase_tax_adjustments_rule_version_id_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_tax_adjustments
    ADD CONSTRAINT purchase_tax_adjustments_rule_version_id_code_key UNIQUE (rule_version_id, code);


--
-- Name: purchase_tax_brackets purchase_tax_brackets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_tax_brackets
    ADD CONSTRAINT purchase_tax_brackets_pkey PRIMARY KEY (id);


--
-- Name: saved_calculations saved_calculations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.saved_calculations
    ADD CONSTRAINT saved_calculations_pkey PRIMARY KEY (id);


--
-- Name: taba_plans_all_pages taba_plans_all_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_all_pages
    ADD CONSTRAINT taba_plans_all_pages_pkey PRIMARY KEY (id);


--
-- Name: taba_plans_page_1 taba_plans_page_1_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_page_1
    ADD CONSTRAINT taba_plans_page_1_pkey PRIMARY KEY (id);


--
-- Name: taba_plans_page_1 taba_plans_page_1_plan_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_page_1
    ADD CONSTRAINT taba_plans_page_1_plan_id_key UNIQUE (plan_id);


--
-- Name: taba_plans_page_2 taba_plans_page_2_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_page_2
    ADD CONSTRAINT taba_plans_page_2_pkey PRIMARY KEY (id);


--
-- Name: taba_plans_page_2 taba_plans_page_2_plan_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_page_2
    ADD CONSTRAINT taba_plans_page_2_plan_id_key UNIQUE (plan_id);


--
-- Name: taba_plans_page_3 taba_plans_page_3_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_page_3
    ADD CONSTRAINT taba_plans_page_3_pkey PRIMARY KEY (id);


--
-- Name: taba_plans_page_3 taba_plans_page_3_plan_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans_page_3
    ADD CONSTRAINT taba_plans_page_3_plan_id_key UNIQUE (plan_id);


--
-- Name: taba_plans taba_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans
    ADD CONSTRAINT taba_plans_pkey PRIMARY KEY (pk);


--
-- Name: taba_plans taba_plans_plan_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans
    ADD CONSTRAINT taba_plans_plan_id_key UNIQUE (plan_id);


--
-- Name: taba_plans taba_plans_plan_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.taba_plans
    ADD CONSTRAINT taba_plans_plan_number_key UNIQUE (plan_number);


--
-- Name: tama70_plans tama70_plans_govmap_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tama70_plans
    ADD CONSTRAINT tama70_plans_govmap_object_id_key UNIQUE (govmap_object_id);


--
-- Name: tama70_plans tama70_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tama70_plans
    ADD CONSTRAINT tama70_plans_pkey PRIMARY KEY (id);


--
-- Name: tax_rule_versions tax_rule_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tax_rule_versions
    ADD CONSTRAINT tax_rule_versions_pkey PRIMARY KEY (id);


--
-- Name: telegram_documents telegram_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_documents
    ADD CONSTRAINT telegram_documents_pkey PRIMARY KEY (id);


--
-- Name: urban_renewal_cities urban_renewal_cities_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_cities
    ADD CONSTRAINT urban_renewal_cities_object_id_key UNIQUE (object_id);


--
-- Name: urban_renewal_cities urban_renewal_cities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_cities
    ADD CONSTRAINT urban_renewal_cities_pkey PRIMARY KEY (id);


--
-- Name: urban_renewal_locations urban_renewal_locations_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_locations
    ADD CONSTRAINT urban_renewal_locations_object_id_key UNIQUE (object_id);


--
-- Name: urban_renewal_locations urban_renewal_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_locations
    ADD CONSTRAINT urban_renewal_locations_pkey PRIMARY KEY (id);


--
-- Name: urban_renewal_mitchamim_rashut urban_renewal_mitchamim_rashut_mispar_mitham_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_mitchamim_rashut
    ADD CONSTRAINT urban_renewal_mitchamim_rashut_mispar_mitham_key UNIQUE (mispar_mitham);


--
-- Name: urban_renewal_mitchamim_rashut urban_renewal_mitchamim_rashut_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_mitchamim_rashut
    ADD CONSTRAINT urban_renewal_mitchamim_rashut_pkey PRIMARY KEY (id);


--
-- Name: urban_renewal_projects urban_renewal_projects_object_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_projects
    ADD CONSTRAINT urban_renewal_projects_object_id_key UNIQUE (object_id);


--
-- Name: urban_renewal_projects urban_renewal_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.urban_renewal_projects
    ADD CONSTRAINT urban_renewal_projects_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: xplan_features xplan_features_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.xplan_features
    ADD CONSTRAINT xplan_features_pkey PRIMARY KEY (id);


--
-- Name: contact_submissions_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX contact_submissions_created_at_idx ON public.contact_submissions USING btree (created_at DESC);


--
-- Name: deals_city_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX deals_city_id_idx ON public.deals USING btree (city_id);


--
-- Name: deals_city_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX deals_city_name_idx ON public.deals USING btree (city_name);


--
-- Name: deals_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX deals_date_idx ON public.deals USING btree (deal_date DESC);


--
-- Name: deals_dedupe_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX deals_dedupe_idx ON public.deals USING btree (COALESCE(city_id, 0), COALESCE(block_parcel_subparcel, ''::text), COALESCE(deal_date, '1900-01-01'::date), COALESCE(price_nis, (0)::numeric));


--
-- Name: deals_price_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX deals_price_idx ON public.deals USING btree (price_nis);


--
-- Name: featured_professionals_published_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX featured_professionals_published_order_idx ON public.featured_professionals USING btree (is_published, display_order, created_at DESC);


--
-- Name: govmap_gushim_by_search_gix_geom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_gushim_by_search_gix_geom ON public.govmap_gushim_by_search USING gist (geom);


--
-- Name: govmap_gushim_by_search_idx_gush; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_gushim_by_search_idx_gush ON public.govmap_gushim_by_search USING btree (gush_num, gush_suffix);


--
-- Name: govmap_gushim_by_search_idx_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_gushim_by_search_idx_status ON public.govmap_gushim_by_search USING btree (status_text);


--
-- Name: govmap_gushim_parcels_by_search_gix_geom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_gushim_parcels_by_search_gix_geom ON public.govmap_gushim_parcels_by_search USING gist (geom);


--
-- Name: govmap_gushim_parcels_by_search_idx_gush; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_gushim_parcels_by_search_idx_gush ON public.govmap_gushim_parcels_by_search USING btree (gush_num, gush_suffix);


--
-- Name: govmap_gushim_parcels_by_search_idx_layer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_gushim_parcels_by_search_idx_layer ON public.govmap_gushim_parcels_by_search USING btree (layer_name);


--
-- Name: govmap_gushim_parcels_by_search_idx_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_gushim_parcels_by_search_idx_parcel ON public.govmap_gushim_parcels_by_search USING btree (parcel) WHERE (parcel IS NOT NULL);


--
-- Name: govmap_plans_gin_coordinates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_plans_gin_coordinates ON public.govmap_plans USING gin (coordinates);


--
-- Name: govmap_plans_gin_raw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_plans_gin_raw ON public.govmap_plans USING gin (raw);


--
-- Name: govmap_plans_idx_migrash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_plans_idx_migrash ON public.govmap_plans USING btree (migrash);


--
-- Name: govmap_plans_idx_mishasava; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_plans_idx_mishasava ON public.govmap_plans USING btree (mishasava);


--
-- Name: govmap_plans_idx_tochnit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_plans_idx_tochnit ON public.govmap_plans USING btree (tochnit);


--
-- Name: govmap_urban_renewal_compounds_geom_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX govmap_urban_renewal_compounds_geom_idx ON public.govmap_urban_renewal_compounds USING gist (geom);


--
-- Name: idx_address_price_trends_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_address_price_trends_address ON public.address_price_trends USING btree (address);


--
-- Name: idx_address_price_trends_address_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_address_price_trends_address_id ON public.address_price_trends USING btree (address_id);


--
-- Name: idx_address_price_trends_city_street; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_address_price_trends_city_street ON public.address_price_trends USING btree (city_name, street_name);


--
-- Name: idx_api_snapshots_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_snapshots_source ON public.api_snapshots USING btree (source_type, source_id);


--
-- Name: idx_dangerous_buildings_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dangerous_buildings_address ON public.dangerous_buildings_active USING btree (address);


--
-- Name: idx_dangerous_buildings_block_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dangerous_buildings_block_parcel ON public.dangerous_buildings_active USING btree (block_number, parcel_number);


--
-- Name: idx_dangerous_buildings_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dangerous_buildings_city ON public.dangerous_buildings_active USING btree (city_name);


--
-- Name: idx_dangerous_buildings_file_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dangerous_buildings_file_number ON public.dangerous_buildings_active USING btree (file_number);


--
-- Name: idx_dangerous_buildings_last_visit_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dangerous_buildings_last_visit_date ON public.dangerous_buildings_active USING btree (last_visit_date);


--
-- Name: idx_dangerous_buildings_occupancy_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dangerous_buildings_occupancy_status ON public.dangerous_buildings_active USING btree (occupancy_status);


--
-- Name: idx_dangerous_buildings_order_opening_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dangerous_buildings_order_opening_date ON public.dangerous_buildings_active USING btree (order_opening_date);


--
-- Name: idx_dangerous_buildings_street_house; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dangerous_buildings_street_house ON public.dangerous_buildings_active USING btree (street_name, house_number);


--
-- Name: idx_dangerous_buildings_treatment_file; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dangerous_buildings_treatment_file ON public.dangerous_buildings_active USING btree (treatment_file);


--
-- Name: idx_dangerous_buildings_treatment_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dangerous_buildings_treatment_status ON public.dangerous_buildings_active USING btree (treatment_status);


--
-- Name: idx_govmap_data_city_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_data_city_name ON public.govmap_data USING btree (city_name);


--
-- Name: idx_govmap_data_govmap_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_data_govmap_id ON public.govmap_data USING btree (govmap_id);


--
-- Name: idx_govmap_data_layer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_data_layer_id ON public.govmap_data USING btree (layer_id);


--
-- Name: idx_govmap_data_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_data_status ON public.govmap_data USING btree (status);


--
-- Name: idx_govmap_data_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_data_updated_at ON public.govmap_data USING btree (updated_at);


--
-- Name: idx_govmap_deals_geom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_deals_geom ON public.govmap_deals USING gist (geometry);


--
-- Name: idx_govmap_deals_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_govmap_deals_unique ON public.govmap_deals USING btree (deal_id);


--
-- Name: idx_govmap_gushim_centroid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_gushim_centroid ON public.govmap_gushim USING gin (centroid);


--
-- Name: idx_govmap_gushim_gush_num; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_gushim_gush_num ON public.govmap_gushim USING btree (gush_num);


--
-- Name: idx_govmap_gushim_gush_suffix; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_gushim_gush_suffix ON public.govmap_gushim USING btree (gush_suffix);


--
-- Name: idx_govmap_gushim_object_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_gushim_object_id ON public.govmap_gushim USING btree (object_id);


--
-- Name: idx_govmap_gushim_status_text; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_gushim_status_text ON public.govmap_gushim USING btree (status_text);


--
-- Name: idx_govmap_gushim_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_gushim_updated_at ON public.govmap_gushim USING btree (updated_at);


--
-- Name: idx_govmap_parcels_data_gush_num; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_data_gush_num ON public.govmap_parcels_data USING btree (gush_num);


--
-- Name: idx_govmap_parcels_data_gush_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_data_gush_parcel ON public.govmap_parcels_data USING btree (gush_num, parcel);


--
-- Name: idx_govmap_parcels_data_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_data_parcel ON public.govmap_parcels_data USING btree (parcel);


--
-- Name: idx_govmap_parcels_data_raw_data; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_data_raw_data ON public.govmap_parcels_data USING gin (raw_data);


--
-- Name: idx_govmap_parcels_data_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_data_status ON public.govmap_parcels_data USING btree (status_text);


--
-- Name: idx_govmap_parcels_gush_num; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_gush_num ON public.govmap_parcels USING btree (gush_num);


--
-- Name: idx_govmap_parcels_gush_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_gush_parcel ON public.govmap_parcels USING btree (gush_num, parcel);


--
-- Name: idx_govmap_parcels_object_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_object_id ON public.govmap_parcels USING btree (object_id);


--
-- Name: idx_govmap_parcels_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_parcel ON public.govmap_parcels USING btree (parcel);


--
-- Name: idx_govmap_parcels_status_text; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_status_text ON public.govmap_parcels USING btree (status_text);


--
-- Name: idx_govmap_parcels_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_parcels_updated_at ON public.govmap_parcels USING btree (updated_at);


--
-- Name: idx_govmap_plans_rami_merchavrmi; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_plans_rami_merchavrmi ON public.govmap_plans_rami USING btree (merchavrmi);


--
-- Name: idx_govmap_plans_rami_object_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_plans_rami_object_id ON public.govmap_plans_rami USING btree (object_id);


--
-- Name: idx_govmap_plans_rami_prjstatus; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_plans_rami_prjstatus ON public.govmap_plans_rami USING btree (prjstatus);


--
-- Name: idx_govmap_plans_rami_statuses; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_plans_rami_statuses ON public.govmap_plans_rami USING btree (statustochnit, prjstatus);


--
-- Name: idx_govmap_plans_rami_statustochnit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_plans_rami_statustochnit ON public.govmap_plans_rami USING btree (statustochnit);


--
-- Name: idx_govmap_plans_rami_tochnit; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_plans_rami_tochnit ON public.govmap_plans_rami USING btree (tochnit);


--
-- Name: idx_govmap_plans_rami_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_govmap_plans_rami_updated_at ON public.govmap_plans_rami USING btree (updated_at);


--
-- Name: idx_meirim_plans_county_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meirim_plans_county_name ON public.meirim_plans USING btree (county_name);


--
-- Name: idx_meirim_plans_meirim_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meirim_plans_meirim_id ON public.meirim_plans USING btree (meirim_id);


--
-- Name: idx_meirim_plans_plan_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meirim_plans_plan_number ON public.meirim_plans USING btree (plan_number);


--
-- Name: idx_meirim_plans_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meirim_plans_updated_at ON public.meirim_plans USING btree (updated_at);


--
-- Name: idx_mitchamim_rashut_city_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitchamim_rashut_city_name ON public.mitchamim_rashut USING btree (city_name);


--
-- Name: idx_mitchamim_rashut_mitcham_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitchamim_rashut_mitcham_id ON public.mitchamim_rashut USING btree (mitcham_id);


--
-- Name: idx_mitchamim_rashut_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitchamim_rashut_status ON public.mitchamim_rashut USING btree (status);


--
-- Name: idx_mitchamim_rashut_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mitchamim_rashut_updated_at ON public.mitchamim_rashut USING btree (updated_at);


--
-- Name: idx_nadlan_jobs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nadlan_jobs_status ON public.nadlan_jobs USING btree (status);


--
-- Name: idx_nadlan_jobs_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nadlan_jobs_updated_at ON public.nadlan_jobs USING btree (updated_at DESC);


--
-- Name: idx_portfolio_items_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portfolio_items_user_id ON public.portfolio_items USING btree (user_id);


--
-- Name: idx_portfolio_items_user_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_portfolio_items_user_type ON public.portfolio_items USING btree (user_id, item_type);


--
-- Name: idx_purchase_brackets_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchase_brackets_version ON public.purchase_tax_brackets USING btree (rule_version_id, buyer_category, sort_order);


--
-- Name: idx_taba_plans_all_pages_page_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taba_plans_all_pages_page_number ON public.taba_plans_all_pages USING btree (page_number);


--
-- Name: idx_taba_plans_all_pages_plan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taba_plans_all_pages_plan_id ON public.taba_plans_all_pages USING btree (plan_id);


--
-- Name: idx_taba_plans_page_1_plan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taba_plans_page_1_plan_id ON public.taba_plans_page_1 USING btree (plan_id);


--
-- Name: idx_taba_plans_page_2_plan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taba_plans_page_2_plan_id ON public.taba_plans_page_2 USING btree (plan_id);


--
-- Name: idx_taba_plans_page_3_plan_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_taba_plans_page_3_plan_id ON public.taba_plans_page_3 USING btree (plan_id);


--
-- Name: idx_talar_prep_centroid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_talar_prep_centroid ON public.govmap_talar_prep USING gin (centroid);


--
-- Name: idx_tax_rule_versions_type_dates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tax_rule_versions_type_dates ON public.tax_rule_versions USING btree (tax_type, effective_from DESC);


--
-- Name: idx_telegram_documents_chat_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_documents_chat_id ON public.telegram_documents USING btree (telegram_chat_id);


--
-- Name: idx_telegram_documents_document_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_documents_document_type ON public.telegram_documents USING btree (document_type);


--
-- Name: idx_telegram_documents_location_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_documents_location_city ON public.telegram_documents USING btree (location_city);


--
-- Name: idx_telegram_documents_message_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_documents_message_id ON public.telegram_documents USING btree (telegram_message_id);


--
-- Name: idx_telegram_documents_processed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_documents_processed_at ON public.telegram_documents USING btree (processed_at);


--
-- Name: idx_telegram_documents_processing_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_documents_processing_status ON public.telegram_documents USING btree (processing_status);


--
-- Name: idx_urban_renewal_cities_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_cities_id ON public.urban_renewal_cities USING btree (city_id);


--
-- Name: idx_urban_renewal_cities_mitcham; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_cities_mitcham ON public.urban_renewal_cities USING btree (mitcham_count);


--
-- Name: idx_urban_renewal_cities_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_cities_name ON public.urban_renewal_cities USING btree (city_name);


--
-- Name: idx_urban_renewal_locations_coordinates; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_locations_coordinates ON public.urban_renewal_locations USING gin (coordinates);


--
-- Name: idx_urban_renewal_locations_layer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_locations_layer ON public.urban_renewal_locations USING btree (layer_id);


--
-- Name: idx_urban_renewal_locations_object_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_locations_object_id ON public.urban_renewal_locations USING btree (object_id);


--
-- Name: idx_urban_renewal_mitchamim_mispar_mitham; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_mitchamim_mispar_mitham ON public.urban_renewal_mitchamim_rashut USING btree (mispar_mitham);


--
-- Name: idx_urban_renewal_mitchamim_semel_yeshuv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_mitchamim_semel_yeshuv ON public.urban_renewal_mitchamim_rashut USING btree (semel_yeshuv);


--
-- Name: idx_urban_renewal_mitchamim_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_mitchamim_status ON public.urban_renewal_mitchamim_rashut USING btree (status);


--
-- Name: idx_urban_renewal_mitchamim_yeshuv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_mitchamim_yeshuv ON public.urban_renewal_mitchamim_rashut USING btree (yeshuv);


--
-- Name: idx_urban_renewal_projects_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_projects_city ON public.urban_renewal_projects USING btree (city_name);


--
-- Name: idx_urban_renewal_projects_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_projects_status ON public.urban_renewal_projects USING btree (status_code);


--
-- Name: idx_urban_renewal_projects_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_urban_renewal_projects_type ON public.urban_renewal_projects USING btree (project_type);


--
-- Name: idx_user_notifications_read_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notifications_read_at ON public.user_notifications USING btree (user_id, read_at);


--
-- Name: idx_user_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_notifications_user_id ON public.user_notifications USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_xplan_geom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_xplan_geom ON public.xplan_features USING gist (geometry);


--
-- Name: idx_xplan_unique_feature; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_xplan_unique_feature ON public.xplan_features USING btree (layer_id, feature_objectid);


--
-- Name: industrial_lots_gix_geom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX industrial_lots_gix_geom ON public.industrial_lots_development_areas USING gist (geom);


--
-- Name: industrial_lots_idx_cdpnum; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX industrial_lots_idx_cdpnum ON public.industrial_lots_development_areas USING btree (cdpnum);


--
-- Name: industrial_lots_idx_ipactive; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX industrial_lots_idx_ipactive ON public.industrial_lots_development_areas USING btree (ipactive);


--
-- Name: industrial_lots_idx_ipname; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX industrial_lots_idx_ipname ON public.industrial_lots_development_areas USING btree (ipnameheb);


--
-- Name: industrial_lots_idx_lotnum; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX industrial_lots_idx_lotnum ON public.industrial_lots_development_areas USING btree (lotnum);


--
-- Name: karkarank_categories_gin_raw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX karkarank_categories_gin_raw ON public.karkarank_categories USING gin (raw);


--
-- Name: karkarank_categories_idx_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX karkarank_categories_idx_parent ON public.karkarank_categories USING btree (parent_id);


--
-- Name: karkarank_categories_uq_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX karkarank_categories_uq_slug ON public.karkarank_categories USING btree (slug);


--
-- Name: karkarank_comments_gin_raw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX karkarank_comments_gin_raw ON public.karkarank_comments USING gin (raw);


--
-- Name: karkarank_comments_idx_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX karkarank_comments_idx_date ON public.karkarank_comments USING btree (date_gmt);


--
-- Name: karkarank_comments_idx_post; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX karkarank_comments_idx_post ON public.karkarank_comments USING btree (post_id);


--
-- Name: karkarank_posts_gin_raw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX karkarank_posts_gin_raw ON public.karkarank_posts USING gin (raw);


--
-- Name: karkarank_posts_idx_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX karkarank_posts_idx_date ON public.karkarank_posts USING btree (date_gmt);


--
-- Name: karkarank_posts_idx_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX karkarank_posts_idx_status ON public.karkarank_posts USING btree (status);


--
-- Name: karkarank_posts_uq_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX karkarank_posts_uq_slug ON public.karkarank_posts USING btree (slug);


--
-- Name: land_use_mavat_gix_geom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX land_use_mavat_gix_geom ON public.land_use_mavat USING gist (geom);


--
-- Name: land_use_mavat_idx_mavat_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX land_use_mavat_idx_mavat_code ON public.land_use_mavat USING btree (mavat_code);


--
-- Name: land_use_mavat_idx_pl_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX land_use_mavat_idx_pl_id ON public.land_use_mavat USING btree (pl_id);


--
-- Name: land_use_mavat_idx_pl_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX land_use_mavat_idx_pl_number ON public.land_use_mavat USING btree (pl_number);


--
-- Name: michrazim_active_gin_raw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX michrazim_active_gin_raw ON public.michrazim_active USING gin (raw);


--
-- Name: michrazim_active_idx_last_seen; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX michrazim_active_idx_last_seen ON public.michrazim_active USING btree (last_seen_at);


--
-- Name: michrazim_gin_raw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX michrazim_gin_raw ON public.michrazim USING gin (raw);


--
-- Name: michrazim_idx_area; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX michrazim_idx_area ON public.michrazim USING btree (area);


--
-- Name: michrazim_idx_deadline_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX michrazim_idx_deadline_date ON public.michrazim USING btree (deadline_date);


--
-- Name: michrazim_idx_publication_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX michrazim_idx_publication_date ON public.michrazim USING btree (publication_date);


--
-- Name: michrazim_idx_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX michrazim_idx_status ON public.michrazim USING btree (status);


--
-- Name: msbs_lots_centroid_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX msbs_lots_centroid_idx ON public.msbs_lots USING gist (centroid);


--
-- Name: msbs_lots_geom_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX msbs_lots_geom_idx ON public.msbs_lots USING gist (geom);


--
-- Name: parcel_ownership_new_gix_geom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX parcel_ownership_new_gix_geom ON public.parcel_ownership_new USING gist (geom);


--
-- Name: parcel_ownership_new_idx_gush_parcel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX parcel_ownership_new_idx_gush_parcel ON public.parcel_ownership_new USING btree (gush_num, gush_suffi, parcel);


--
-- Name: parcel_ownership_new_idx_ownership_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX parcel_ownership_new_idx_ownership_type ON public.parcel_ownership_new USING btree (ownership_type);


--
-- Name: password_reset_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX password_reset_tokens_token_hash_key ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: password_reset_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX password_reset_tokens_user_id_idx ON public.password_reset_tokens USING btree (user_id);


--
-- Name: taba_plans_gin_raw; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taba_plans_gin_raw ON public.taba_plans USING gin (raw);


--
-- Name: taba_plans_idx_area; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taba_plans_idx_area ON public.taba_plans USING btree (area);


--
-- Name: taba_plans_idx_publication_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taba_plans_idx_publication_date ON public.taba_plans USING btree (publication_date);


--
-- Name: taba_plans_idx_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX taba_plans_idx_status ON public.taba_plans USING btree (status);


--
-- Name: taba_plans_uq_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX taba_plans_uq_id ON public.taba_plans USING btree (id) WHERE (id IS NOT NULL);


--
-- Name: tama70_plans_gix_geom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tama70_plans_gix_geom ON public.tama70_plans USING gist (geom);


--
-- Name: tama70_plans_idx_plan_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tama70_plans_idx_plan_number ON public.tama70_plans USING btree (plan_number);


--
-- Name: featured_professionals featured_professionals_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER featured_professionals_set_updated_at BEFORE UPDATE ON public.featured_professionals FOR EACH ROW EXECUTE FUNCTION public.featured_professionals_touch_updated_at();


--
-- Name: govmap_deals trg_govmap_deals_set_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_govmap_deals_set_updated BEFORE UPDATE ON public.govmap_deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();


--
-- Name: xplan_features trg_xplan_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_xplan_set_updated_at BEFORE UPDATE ON public.xplan_features FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: govmap_parcels_data update_govmap_parcels_data_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_govmap_parcels_data_updated_at BEFORE UPDATE ON public.govmap_parcels_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nadlan_jobs update_nadlan_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_nadlan_jobs_updated_at BEFORE UPDATE ON public.nadlan_jobs FOR EACH ROW EXECUTE FUNCTION public.update_nadlan_jobs_updated_at();


--
-- Name: telegram_documents update_telegram_documents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_telegram_documents_updated_at BEFORE UPDATE ON public.telegram_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: calculation_logs calculation_logs_rule_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calculation_logs
    ADD CONSTRAINT calculation_logs_rule_version_id_fkey FOREIGN KEY (rule_version_id) REFERENCES public.tax_rule_versions(id);


--
-- Name: capital_gains_rules capital_gains_rules_rule_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.capital_gains_rules
    ADD CONSTRAINT capital_gains_rules_rule_version_id_fkey FOREIGN KEY (rule_version_id) REFERENCES public.tax_rule_versions(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: portfolio_items portfolio_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: purchase_tax_adjustments purchase_tax_adjustments_rule_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_tax_adjustments
    ADD CONSTRAINT purchase_tax_adjustments_rule_version_id_fkey FOREIGN KEY (rule_version_id) REFERENCES public.tax_rule_versions(id) ON DELETE CASCADE;


--
-- Name: purchase_tax_brackets purchase_tax_brackets_rule_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchase_tax_brackets
    ADD CONSTRAINT purchase_tax_brackets_rule_version_id_fkey FOREIGN KEY (rule_version_id) REFERENCES public.tax_rule_versions(id) ON DELETE CASCADE;


--
-- Name: user_notification_preferences user_notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_notifications user_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: nadlan_jobs Allow public insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public insert" ON public.nadlan_jobs FOR INSERT WITH CHECK (true);


--
-- Name: nadlan_jobs Allow public read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public read" ON public.nadlan_jobs FOR SELECT USING (true);


--
-- Name: nadlan_jobs Allow public update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public update" ON public.nadlan_jobs FOR UPDATE USING (true);


--
-- Name: contact_submissions Anyone can submit contact form; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can submit contact form" ON public.contact_submissions FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: user_notification_preferences Users insert own notification preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users insert own notification preferences" ON public.user_notification_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users read own notification preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users read own notification preferences" ON public.user_notification_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_notification_preferences Users update own notification preferences; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users update own notification preferences" ON public.user_notification_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: app_data_snapshots; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.app_data_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: calculation_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.calculation_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: capital_gains_rules; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.capital_gains_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_submissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: capital_gains_rules deny_anon_cg_rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY deny_anon_cg_rules ON public.capital_gains_rules TO anon USING (false);


--
-- Name: purchase_tax_adjustments deny_anon_purchase_adj; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY deny_anon_purchase_adj ON public.purchase_tax_adjustments TO anon USING (false);


--
-- Name: purchase_tax_brackets deny_anon_purchase_brackets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY deny_anon_purchase_brackets ON public.purchase_tax_brackets TO anon USING (false);


--
-- Name: tax_rule_versions deny_anon_tax_rules; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY deny_anon_tax_rules ON public.tax_rule_versions TO anon USING (false);


--
-- Name: featured_professionals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.featured_professionals ENABLE ROW LEVEL SECURITY;

--
-- Name: calculation_logs logs_no_insert_client; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY logs_no_insert_client ON public.calculation_logs FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: calculation_logs logs_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY logs_select_own ON public.calculation_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: nadlan_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.nadlan_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_tax_adjustments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.purchase_tax_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_tax_brackets; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.purchase_tax_brackets ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_calculations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.saved_calculations ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_calculations saved_delete_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY saved_delete_own ON public.saved_calculations FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: saved_calculations saved_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY saved_insert_own ON public.saved_calculations FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: saved_calculations saved_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY saved_select_own ON public.saved_calculations FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: saved_calculations saved_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY saved_update_own ON public.saved_calculations FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: taba_plans; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.taba_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: taba_plans taba_plans anon insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "taba_plans anon insert" ON public.taba_plans FOR INSERT TO anon WITH CHECK (true);


--
-- Name: taba_plans taba_plans anon select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "taba_plans anon select" ON public.taba_plans FOR SELECT TO anon USING (true);


--
-- Name: taba_plans taba_plans anon update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "taba_plans anon update" ON public.taba_plans FOR UPDATE TO anon USING (true) WITH CHECK (true);


--
-- Name: tax_rule_versions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tax_rule_versions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: featured_professionals ציבור יכול לקרוא רק פרסומים; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "ציבור יכול לקרוא רק פרסומים" ON public.featured_professionals FOR SELECT TO authenticated, anon USING ((is_published = true));


--
-- PostgreSQL database dump complete
--

\unrestrict mD57NZiObRs2QpE7BLwEQfPhmyBnFGyujiETgyzfZb0ws0x6apEjavNam50bptj

