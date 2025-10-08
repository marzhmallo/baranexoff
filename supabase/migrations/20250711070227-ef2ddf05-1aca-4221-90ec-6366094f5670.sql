CREATE OR REPLACE FUNCTION public.get_age_distribution()
 RETURNS TABLE(age_group text, count bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN age BETWEEN 0 AND 12 THEN '0-12 (Child)'
      WHEN age BETWEEN 13 AND 17 THEN '13-17 (Teen)'
      WHEN age BETWEEN 18 AND 29 THEN '18-29 (Young Adult)'
      WHEN age BETWEEN 30 AND 59 THEN '30-59 (Adult)'
      ELSE '60+ (Senior Citizen)'
    END AS age_group,
    COUNT(*) AS count
  FROM (
    SELECT
      EXTRACT(YEAR FROM AGE(NOW(), birthdate))::INTEGER AS age
    FROM residents
  ) AS age_data
  GROUP BY age_group
  ORDER BY
    CASE age_group
      WHEN '0-12 (Child)' THEN 1
      WHEN '13-17 (Teen)' THEN 2
      WHEN '18-29 (Young Adult)' THEN 3
      WHEN '30-59 (Adult)' THEN 4
      WHEN '60+ (Senior Citizen)' THEN 5
    END;
END;
$function$