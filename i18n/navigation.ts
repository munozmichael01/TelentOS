import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Wrappers locale-aware de Link/redirect/router: mantienen el prefijo de idioma
// automáticamente. Usar estos en la app en vez de los de next/link y next/navigation.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
