DELETE FROM public.brand_memory a
USING public.brand_memory b
WHERE a.id < b.id
  AND a.profile_id = b.profile_id
  AND a.pattern_category = b.pattern_category
  AND a.pattern_value = b.pattern_value;

CREATE UNIQUE INDEX brand_memory_profile_category_value_unique
ON public.brand_memory (profile_id, pattern_category, pattern_value);