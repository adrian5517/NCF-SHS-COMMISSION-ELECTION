-- ============================================================
-- NCF-SHS-COMMISSION-ON-ELECTIONS — mockup STUDENTS
-- Optional. Paste into the Supabase SQL Editor and run to populate
-- a student masterlist for testing (Admin → Students, code
-- generation, turnout, and the kiosk login flow).
--
-- - Student IDs use the 12-##### format.
-- - Grades 1–6, two sections each, matching the official ballot's
--   grade/section naming so bulk code generation lines up.
-- - All start as 'pending' so you can run the full voting flow.
--
-- Idempotent WITHOUT ON CONFLICT: only IDs that don't already exist
-- are inserted (WHERE NOT EXISTS), so re-running never errors and
-- never touches rows you've edited. To remove them later, run
-- supabase/remove-sample-students.sql.
-- ============================================================

insert into public.students (lrn, full_name, grade_level, section, strand, status)
select v.lrn, v.full_name, v.grade_level, v.section, v.strand, v.status
from (values
  -- ---------- Grade 1 ----------
  ('12-00001', 'Aaron Villareal',   'Grade 1', 'Ashbel',    '', 'pending'),
  ('12-00002', 'Bianca Salazar',    'Grade 1', 'Ashbel',    '', 'pending'),
  ('12-00003', 'Cy Ramos',          'Grade 1', 'Ashbel',    '', 'pending'),
  ('12-00004', 'Denise Alonzo',     'Grade 1', 'Ashbel',    '', 'pending'),
  ('12-00005', 'Elijah Bautista',   'Grade 1', 'Nicholas',  '', 'pending'),
  ('12-00006', 'Faye Delos Santos', 'Grade 1', 'Nicholas',  '', 'pending'),
  ('12-00007', 'Gabriel Ocampo',    'Grade 1', 'Nicholas',  '', 'pending'),
  ('12-00008', 'Hazel Mercado',     'Grade 1', 'Nicholas',  '', 'pending'),

  -- ---------- Grade 2 ----------
  ('12-00009', 'Ian Pascual',       'Grade 2', 'Jeremiel',  '', 'pending'),
  ('12-00010', 'Jamie Robles',      'Grade 2', 'Jeremiel',  '', 'pending'),
  ('12-00011', 'Kervin Aquino',     'Grade 2', 'Jeremiel',  '', 'pending'),
  ('12-00012', 'Lara Fajardo',      'Grade 2', 'Jeremiel',  '', 'pending'),
  ('12-00013', 'Marco Tolentino',   'Grade 2', 'Timothy',   '', 'pending'),
  ('12-00014', 'Nadine Rivera',     'Grade 2', 'Timothy',   '', 'pending'),
  ('12-00015', 'Oliver Santiago',   'Grade 2', 'Timothy',   '', 'pending'),
  ('12-00016', 'Patricia Gomez',    'Grade 2', 'Timothy',   '', 'pending'),

  -- ---------- Grade 3 ----------
  ('12-00017', 'Quincy Navarro',    'Grade 3', 'Clovis',    '', 'pending'),
  ('12-00018', 'Rhea Castillo',     'Grade 3', 'Clovis',    '', 'pending'),
  ('12-00019', 'Samuel Domingo',    'Grade 3', 'Clovis',    '', 'pending'),
  ('12-00020', 'Trisha Valdez',     'Grade 3', 'Clovis',    '', 'pending'),
  ('12-00021', 'Uriel Manalo',      'Grade 3', 'Eran',      '', 'pending'),
  ('12-00022', 'Vince Cabrera',     'Grade 3', 'Eran',      '', 'pending'),
  ('12-00023', 'Winona Esguerra',   'Grade 3', 'Eran',      '', 'pending'),
  ('12-00024', 'Xander Lim',        'Grade 3', 'Eran',      '', 'pending'),

  -- ---------- Grade 4 ----------
  ('12-00025', 'Yohan Mendoza',     'Grade 4', 'Magnus',    '', 'pending'),
  ('12-00026', 'Zara Panganiban',   'Grade 4', 'Magnus',    '', 'pending'),
  ('12-00027', 'Aldrin Reyes',      'Grade 4', 'Magnus',    '', 'pending'),
  ('12-00028', 'Bea Soriano',       'Grade 4', 'Magnus',    '', 'pending'),
  ('12-00029', 'Carl Espino',       'Grade 4', 'Clement',   '', 'pending'),
  ('12-00030', 'Danica Torres',     'Grade 4', 'Clement',   '', 'pending'),
  ('12-00031', 'Emmanuel Cruz',     'Grade 4', 'Clement',   '', 'pending'),
  ('12-00032', 'Frances Yap',       'Grade 4', 'Clement',   '', 'pending'),

  -- ---------- Grade 5 ----------
  ('12-00033', 'Gian Molina',       'Grade 5', 'Anselm',    '', 'pending'),
  ('12-00034', 'Hannah Bernardo',   'Grade 5', 'Anselm',    '', 'pending'),
  ('12-00035', 'Isaac Villanueva',  'Grade 5', 'Anselm',    '', 'pending'),
  ('12-00036', 'Julia Cordero',     'Grade 5', 'Anselm',    '', 'pending'),
  ('12-00037', 'Kyle Andrada',      'Grade 5', 'Zachary',   '', 'pending'),
  ('12-00038', 'Louise Gutierrez',  'Grade 5', 'Zachary',   '', 'pending'),
  ('12-00039', 'Miguel Sarmiento',  'Grade 5', 'Zachary',   '', 'pending'),
  ('12-00040', 'Nicole Flores',     'Grade 5', 'Zachary',   '', 'pending'),

  -- ---------- Grade 6 ----------
  ('12-00041', 'Owen Dela Rosa',    'Grade 6', 'Androcles', '', 'pending'),
  ('12-00042', 'Paige Enriquez',    'Grade 6', 'Androcles', '', 'pending'),
  ('12-00043', 'Rafael Marasigan',  'Grade 6', 'Androcles', '', 'pending'),
  ('12-00044', 'Sophia Del Mundo',  'Grade 6', 'Androcles', '', 'pending'),
  ('12-00045', 'Tristan Bringas',   'Grade 6', 'Alexander', '', 'pending'),
  ('12-00046', 'Ualan Carpio',      'Grade 6', 'Alexander', '', 'pending'),
  ('12-00047', 'Vera Aguilar',      'Grade 6', 'Alexander', '', 'pending'),
  ('12-00048', 'Wesley Fabregas',   'Grade 6', 'Alexander', '', 'pending')
) as v(lrn, full_name, grade_level, section, strand, status)
where not exists (
  select 1 from public.students s where s.lrn = v.lrn
);
