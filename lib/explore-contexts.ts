export type ExploreContextId =
  | "open_now"
  | "work_2h"
  | "brunch_long"
  | "solo"
  | "first_date"
  | "snack_fast"
  | "reading"
  | "group_4";

export type ExploreContextDef = {
  id: ExploreContextId;
  label: string;
  subtitle: string;
};

export const EXPLORE_CONTEXTS: ExploreContextDef[] = [
  {
    id: "open_now",
    label: "Abiertos ahora",
    subtitle: "Para salir ya",
  },
  {
    id: "work_2h",
    label: "Trabajar 2 h",
    subtitle: "Café y foco",
  },
  {
    id: "brunch_long",
    label: "Brunch largo",
    subtitle: "Domingo sin apuro",
  },
  {
    id: "solo",
    label: "Ir solo",
    subtitle: "Barra o mesa cómoda",
  },
  {
    id: "first_date",
    label: "Primera cita",
    subtitle: "Luz y conversación",
  },
  {
    id: "snack_fast",
    label: "Merienda rápida",
    subtitle: "Sin cola eterna",
  },
  {
    id: "reading",
    label: "Para leer",
    subtitle: "Tranqui y buena luz",
  },
  {
    id: "group_4",
    label: "Con 4 personas",
    subtitle: "Mesa y compartir",
  },
];
