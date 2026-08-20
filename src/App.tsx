import { useEffect } from "react";
import type { ReactNode } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { navigate, useRoute } from "./lib/utils";
import { Icon } from "./components/icons";
import { Button, EmptyState, ToastHost } from "./components/ui";
import { StoreChrome } from "./features/StoreChrome";
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductPage } from "./pages/ProductPage";
import { CartPage, CheckoutPage } from "./pages/CartPage";
import { AccountPage, AuthPage } from "./pages/AccountPage";
import { DashboardOverview, DashboardShell } from "./pages/dashboard/DashboardShell";
import { CatalogAdmin } from "./pages/dashboard/CatalogAdmin";
import { CouponsAdmin, SlidersAdmin } from "./pages/dashboard/SlidersAdmin";
import { OrdersAdmin } from "./pages/dashboard/OrdersAdmin";
import { SecurityAdmin, SettingsAdmin, UsersAdmin } from "./pages/dashboard/SystemAdmin";

function BootScreen() {
  return (
    <div className="min-h-dvh bg-ink grid place-items-center grid-dark relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] glow-volt opacity-60" />
      <div className="text-center relative">
        <span className="inline-grid place-items-center w-20 h-20 bg-volt text-white notch bolt-pulse mb-6">
          <Icon name="bolt" size={42} />
        </span>
        <p className="font-d text-2xl font-bold text-paper tracking-tight">
          VOLT<span className="text-volt">·</span>MOBILE
        </p>
        <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.3em] text-paper/40">Secure boot · seeding vault</p>
        <div className="mt-6 w-48 h-[3px] bg-paper/10 mx-auto overflow-hidden">
          <div className="h-full w-1/2 bg-volt skeleton-dark" style={{ animation: "shimmer 1s linear infinite" }} />
        </div>
      </div>
    </div>
  );
}

function Router() {
  const route = useRoute();
  const { ready } = useApp();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.path]);

  if (!ready) return <BootScreen />;

  const root = route.parts[0];
  const isDashboard = root === "dashboard";

  let page: ReactNode;
  if (isDashboard) {
    const sub = route.parts[1];
    let inner: ReactNode;
    if (!sub) inner = <DashboardOverview />;
    else if (sub === "products") inner = <CatalogAdmin route={route} />;
    else if (sub === "sliders") inner = <SlidersAdmin route={route} />;
    else if (sub === "coupons") inner = <CouponsAdmin />;
    else if (sub === "orders") inner = <OrdersAdmin />;
    else if (sub === "users") inner = <UsersAdmin />;
    else if (sub === "settings") inner = <SettingsAdmin />;
    else if (sub === "security") inner = <SecurityAdmin />;
    else inner = <DashboardOverview />;
    page = <DashboardShell route={route}>{inner}</DashboardShell>;
  } else if (!root) page = <HomePage />;
  else if (root === "shop") page = <ShopPage />;
  else if (root === "deals") page = <ShopPage dealsOnly />;
  else if (root === "product" && route.parts[1]) page = <ProductPage id={route.parts[1]} />;
  else if (root === "cart") page = <CartPage />;
  else if (root === "checkout") page = <CheckoutPage />;
  else if (root === "auth") page = <AuthPage />;
  else if (root === "account") page = <AccountPage />;
  else
    page = (
      <EmptyState
        icon="zap"
        title="404 — circuit not found"
        sub="That route doesn't exist in this store."
        action={<Button onClick={() => navigate("/")}>Back to home</Button>}
      />
    );

  return (
    <>
      {isDashboard ? page : <StoreChrome route={route}>{page}</StoreChrome>}
      <ToastHost />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
