'use client';
import {createBrowserClient} from '@supabase/ssr';
import type {Database} from '@/types/database';
import {getSupabaseConfig} from './config';
let instance:ReturnType<typeof createBrowserClient<Database>>|null=null;
export function navegadorSupabase(){const cfg=getSupabaseConfig();if(!cfg)throw new Error('Falta la configuración pública de Supabase.');
 if(!instance)instance=createBrowserClient<Database>(cfg.url,cfg.key);return instance;}
