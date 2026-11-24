-- 운영 DB의 활성 카페·음식점과 최신 상호 번역으로 공개 검색 사전을 만든다.
-- psql -XAt -v ON_ERROR_STOP=1 -f scripts/export-place-search.sql -o public/data/place-search.json
select coalesce(json_agg(json_build_object(
    'id', s.id, 'ko', s.name, 'en', t.name_en, 'zh', t.name_zh, 'ja', t.name_ja
) order by s.id), '[]'::json)
from public.store s
left join public.store_name_translation t on t.store_id = s.id and t.source_name = s.name
where s.active and s.kind in ('CAFE', 'KOREAN', 'OTHER');
