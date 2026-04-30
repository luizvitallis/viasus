-- ============================================================================
--  0008_fix_fk_on_delete.sql — ajustar FKs sem ON DELETE pra SET NULL
--
--  Bug: deletar um nó que tinha cliques registrados em protocol_usage falhava
--  com "violates foreign key constraint protocol_usage_node_id_fkey" porque
--  a FK estava com ação NO ACTION (default).
--
--  Decisão: SET NULL preserva o evento histórico (analytics), só perde a
--  referência ao recurso deletado. Aplicado em todas as FKs cuja ausência
--  do ON DELETE viraria pedra no futuro.
-- ============================================================================

-- ----- protocol_usage -----
alter table public.protocol_usage drop constraint if exists protocol_usage_node_id_fkey;
alter table public.protocol_usage
  add constraint protocol_usage_node_id_fkey
  foreign key (node_id) references public.nodes(id) on delete set null;

alter table public.protocol_usage drop constraint if exists protocol_usage_user_id_fkey;
alter table public.protocol_usage
  add constraint protocol_usage_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

alter table public.protocol_usage drop constraint if exists protocol_usage_version_id_fkey;
alter table public.protocol_usage
  add constraint protocol_usage_version_id_fkey
  foreign key (version_id) references public.protocol_versions(id) on delete set null;

-- ----- protocol_audit -----
alter table public.protocol_audit drop constraint if exists protocol_audit_user_id_fkey;
alter table public.protocol_audit
  add constraint protocol_audit_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

-- ----- attachments -----
alter table public.attachments drop constraint if exists attachments_uploaded_by_fkey;
alter table public.attachments
  add constraint attachments_uploaded_by_fkey
  foreign key (uploaded_by) references public.profiles(id) on delete set null;

-- ----- protocol_versions -----
alter table public.protocol_versions drop constraint if exists protocol_versions_published_by_fkey;
alter table public.protocol_versions
  add constraint protocol_versions_published_by_fkey
  foreign key (published_by) references public.profiles(id) on delete set null;

-- ----- protocols -----
alter table public.protocols drop constraint if exists protocols_owner_curator_id_fkey;
alter table public.protocols
  add constraint protocols_owner_curator_id_fkey
  foreign key (owner_curator_id) references public.profiles(id) on delete set null;

alter table public.protocols drop constraint if exists protocols_created_by_fkey;
alter table public.protocols
  add constraint protocols_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.protocols drop constraint if exists protocols_source_protocol_id_fkey;
alter table public.protocols
  add constraint protocols_source_protocol_id_fkey
  foreign key (source_protocol_id) references public.protocols(id) on delete set null;

-- ----- nodes (referências cruzadas a outros protocols) -----
alter table public.nodes drop constraint if exists nodes_links_to_protocol_id_fkey;
alter table public.nodes
  add constraint nodes_links_to_protocol_id_fkey
  foreign key (links_to_protocol_id) references public.protocols(id) on delete set null;

alter table public.nodes drop constraint if exists nodes_encaminhamento_target_id_fkey;
alter table public.nodes
  add constraint nodes_encaminhamento_target_id_fkey
  foreign key (encaminhamento_target_id) references public.protocols(id) on delete set null;
