import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoadingScreen from "@/components/LoadingScreen";
import Home from "./pages/Home";
import Photo from "./pages/Photo";
import Favourite from "./pages/Favourite";
import Account from "./pages/Account";
import ProductDetail from "./pages/ProductDetail";
import PhotoDetail from "./pages/PhotoDetail";
import CategoryProducts from "./pages/CategoryProducts";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import Exchange from "./pages/Exchange";
import Cart from "./pages/Cart";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProductsManage from "./pages/admin/ProductsManage";
import ProductNew from "./pages/admin/ProductNew";
import PhotosManage from "./pages/admin/PhotosManage";
import PhotoNew from "./pages/admin/PhotoNew";
import OrdersManage from "./pages/admin/OrdersManage";
import UsersManage from "./pages/admin/UsersManage";
import WithdrawalSettings from "./pages/admin/WithdrawalSettings";
import WithdrawalItemsManage from "./pages/admin/WithdrawalItemsManage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [showLoading, setShowLoading] = useState(true);

  if (showLoading) {
    return <LoadingScreen onLoadComplete={() => setShowLoading(false)} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/signup" element={<Signup />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photo"
                element={
                  <ProtectedRoute>
                    <Photo />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favourite"
                element={
                  <ProtectedRoute>
                    <Favourite />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/product/:id"
                element={
                  <ProtectedRoute>
                    <ProductDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/photo/:id"
                element={
                  <ProtectedRoute>
                    <PhotoDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/category/:category"
                element={
                  <ProtectedRoute>
                    <CategoryProducts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/terms"
                element={
                  <ProtectedRoute>
                    <Terms />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/contact"
                element={
                  <ProtectedRoute>
                    <Contact />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute>
                    <ProductsManage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/products/new"
                element={
                  <ProtectedRoute>
                    <ProductNew />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/photos"
                element={
                  <ProtectedRoute>
                    <PhotosManage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/photos/new"
                element={
                  <ProtectedRoute>
                    <PhotoNew />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute>
                    <OrdersManage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <UsersManage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/withdrawal-settings"
                element={
                  <ProtectedRoute>
                    <WithdrawalSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/withdrawal-items"
                element={
                  <ProtectedRoute>
                    <WithdrawalItemsManage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exchange"
                element={
                  <ProtectedRoute>
                    <Exchange />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <Cart />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
