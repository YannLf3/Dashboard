/* ---------------------------------------------------------
   Configuration Supabase
   ---------------------------------------------------------
   Laisse ces deux valeurs vides => l'app tourne en MODE LOCAL
   (données dans le navigateur de l'appareil uniquement).

   Remplis-les (voir README, étape « Supabase ») => MODE CLOUD :
   connexion par email + mot de passe, données synchronisées
   entre ton Mac, ton iPhone et ton iPad.

   La clé « anon / publishable » est PUBLIQUE par conception :
   elle peut être commitée. Ce qui protège tes données, ce sont
   les règles RLS du fichier supabase/schema.sql (chaque ligne
   n'est lisible que par son propriétaire connecté).
   NE METS JAMAIS ici la clé « service_role / secret ».
   --------------------------------------------------------- */
export const SUPABASE_URL = 'https://idcngrvcwcnkkwblqbnf.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_4K2OLRS980iF9ape-HLQQA_c3B9u_JL';

/* Bibliothèques chargées à la demande (CDN). */
export const CDN = {
  supabase: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm',
  jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js',
  autotable: 'https://cdn.jsdelivr.net/npm/jspdf-autotable@5.0.9/dist/jspdf.plugin.autotable.min.js',
};
