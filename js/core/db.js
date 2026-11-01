/* ---------------------------------------------------------
   Couche d'accès aux données — « pattern adaptateur ».
   Le reste de l'app ne sait pas OÙ sont stockées les données :
   elle appelle toujours loadAll / put / remove. Deux adaptateurs
   implémentent ces mêmes méthodes :
     - LocalAdapter    : localStorage (un seul appareil)
     - SupabaseAdapter : base Postgres en ligne (multi-appareils)
   Toutes les données sont rangées dans UNE table générique
   `records(collection, id, data jsonb)` (voir supabase/schema.sql).
   --------------------------------------------------------- */
import { SUPABASE_URL, SUPABASE_ANON_KEY, CDN } from '../config.js';

const LS_PREFIX = 'yl-dash:v1:';

class LocalAdapter {
  mode = 'local';
  async init() {}
  async loadAll() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key.startsWith(LS_PREFIX)) continue;
      try { out[key.slice(LS_PREFIX.length)] = JSON.parse(localStorage.getItem(key)) || []; } catch { /* donnée corrompue ignorée */ }
    }
    return out;
  }
  #write(collection, rows) { localStorage.setItem(LS_PREFIX + collection, JSON.stringify(rows)); }
  #read(collection) { try { return JSON.parse(localStorage.getItem(LS_PREFIX + collection)) || []; } catch { return []; } }
  async put(collection, record) {
    const rows = this.#read(collection);
    const i = rows.findIndex((r) => r.id === record.id);
    if (i >= 0) rows[i] = record; else rows.push(record);
    this.#write(collection, rows);
    return record;
  }
  async remove(collection, id) {
    this.#write(collection, this.#read(collection).filter((r) => r.id !== id));
  }
  hasData() { return Object.keys(localStorage).some((k) => k.startsWith(LS_PREFIX)); }
  async clear() { Object.keys(localStorage).filter((k) => k.startsWith(LS_PREFIX)).forEach((k) => localStorage.removeItem(k)); }
}

class SupabaseAdapter {
  mode = 'cloud';
  client = null;
  user = null;

  async init() {
    // Import dynamique : la librairie n'est téléchargée qu'en mode cloud.
    const { createClient } = await import(CDN.supabase);
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const { data } = await this.client.auth.getSession();
    this.user = data.session?.user ?? null;
  }

  /* ----- Authentification ----- */
  onAuthChange(cb) {
    return this.client.auth.onAuthStateChange((event, session) => { this.user = session?.user ?? null; cb(event, session); });
  }
  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateAuthError(error));
    this.user = data.user;
  }
  async signUp(email, password) {
    const { data, error } = await this.client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) throw new Error(translateAuthError(error));
    return data;
  }
  async resetPassword(email) {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw new Error(translateAuthError(error));
  }
  async updatePassword(password) {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw new Error(translateAuthError(error));
  }
  async signOut() { await this.client.auth.signOut(); this.user = null; }

  /* ----- Données -----
     RLS (Row Level Security) côté Postgres garantit que la requête
     ne renvoie QUE les lignes de l'utilisateur connecté : pas besoin
     de filtrer par user_id ici, et impossible de lire celles des autres. */
  async loadAll() {
    const out = {};
    const pageSize = 1000; // PostgREST limite les réponses : on pagine
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await this.client.from('records')
        .select('collection,data').order('collection').order('id').range(from, from + pageSize - 1);
      if (error) throw new Error(`Lecture impossible : ${error.message}`);
      data.forEach((r) => { (out[r.collection] ??= []).push(r.data); });
      if (data.length < pageSize) break;
    }
    return out;
  }
  async put(collection, record) {
    const { error } = await this.client.from('records').upsert(
      { user_id: this.user.id, collection, id: record.id, data: record },
      { onConflict: 'user_id,collection,id' },
    );
    if (error) {
      if (/figé|émis|brouillon/.test(error.message)) throw new Error(error.message); // message du trigger SQL
      if (error.code === '23505') throw new Error('Ce numéro de document existe déjà (émis depuis un autre appareil ?). Recharge la page.');
      throw new Error(`Enregistrement refusé : ${error.message}`);
    }
    return record;
  }
  async remove(collection, id) {
    const { error } = await this.client.from('records').delete().match({ collection, id });
    if (error) throw new Error(`Suppression refusée : ${error.message}`);
  }
}

function translateAuthError(error) {
  const m = error.message || '';
  if (/Invalid login/i.test(m)) return 'Email ou mot de passe incorrect.';
  if (/Email not confirmed/i.test(m)) return 'Confirme d’abord ton adresse via le lien reçu par email.';
  if (/Signups not allowed/i.test(m)) return 'Les inscriptions sont fermées sur ce projet (c’est voulu après création de ton compte).';
  if (/Password should be/i.test(m)) return 'Mot de passe trop court (8 caractères minimum conseillés).';
  return m;
}

export const isCloudConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const db = isCloudConfigured() ? new SupabaseAdapter() : new LocalAdapter();
export const localDb = db instanceof LocalAdapter ? db : new LocalAdapter();
