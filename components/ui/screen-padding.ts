/**
 * Espacio vertical para que el contenido scrollable quede por encima del
 * `FloatingTabBar` (barra flotante inferior). Usar en `contentContainerStyle`:
 * `paddingBottom: paddingBottomWithFloatingTabBar(insets.bottom)`.
 *
 * Rutas stack a pantalla completa (sin tab bar): usar `paddingBottomStackScreen`.
 *
 * `contentInsetAdjustmentBehavior` (iOS):
 * - `never` cuando el header ya aplica `useSafeAreaInsets` (p. ej. `TabScreenHeader` o
 *   `StackScreenHeader` fuera del `ScrollView`/`FlatList`).
 * - `automatic` cuando el encabezado va dentro de `ListHeader` sin padding superior
 *   explícito y conviene que el sistema ajuste el safe area.
 */

export const FLOATING_TAB_BAR_CLEARANCE = 140;

const STACK_SCROLL_EXTRA_DEFAULT = 48;

export function paddingBottomWithFloatingTabBar(bottomInset: number): number {
  return FLOATING_TAB_BAR_CLEARANCE + bottomInset;
}

export function paddingBottomStackScreen(
  bottomInset: number,
  extra = STACK_SCROLL_EXTRA_DEFAULT,
): number {
  return extra + bottomInset;
}
