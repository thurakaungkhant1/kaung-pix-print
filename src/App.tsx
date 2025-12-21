import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnlineUsersProvider } from "@/contexts/OnlineUsersContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { GlobalMessageNotificationProvider } from "@/contexts/GlobalMessageNotificationContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import LoadingScreen from "@/components/LoadingScreen";
import Home from "./pages/Home";
import Photo from "./pages/Photo";
import Favourite from "./pages/Favourite";
import Account from "./pages/Account";
import AIChat from "./pages/AIChat";
import ProductDetail from "./pages/ProductDetail";
import PhotoDetail from "./pages/PhotoDetail";
import CategoryProducts from "./pages/CategoryProducts";
import MLBBDiamonds from "./pages/MLBBDiamonds";
import Terms from "./pages/Terms";
import Contact from "./pages/Contact";
import Exchange from "./pages/Exchange";
import Cart from "./pages/Cart";
import PointHistory from "./pages/PointHistory";
import TopEarners from "./pages/TopEarners";
import Chat from "./pages/Chat";
import ChatList from "./pages/ChatList";
import ExploreUsers from "./pages/ExploreUsers";
import PublicProfile from "./pages/PublicProfile";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProductsManage from "./pages/admin/ProductsManage";
import ProductNew from "./pages/admin/ProductNew";
import DiamondPackages from "./pages/admin/DiamondPackages";
import DiamondPackageForm from "./pages/admin/DiamondPackageForm";
import PhotosManage from "./pages/admin/PhotosManage";
import PhotoNew from "./pages/admin/PhotoNew";
import OrdersManage from "./pages/admin/OrdersManage";
import UsersManage from "./pages/admin/UsersManage";
import WithdrawalSettings from "./pages/admin/WithdrawalSettings";
import WithdrawalItemsManage from "./pages/admin/WithdrawalItemsManage";
import PremiumUsersManage from "./pages/admin/PremiumUsersManage";
import PremiumPlansManage from "./pages/admin/PremiumPlansManage";
import ReportsManage from "./pages/admin/ReportsManage";
import PremiumHistory from "./pages/PremiumHistory";
import PremiumShop from "./pages/PremiumShop";
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
            <LanguageProvider>
            <OnlineUsersProvider>
            <GlobalMessageNotificationProvider>
              <Routes>
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/signup" element={<Signup />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/auth/verify-email" element={<VerifyEmail />} />
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
                path="/ai-chat"
                element={
                  <ProtectedRoute>
                    <AIChat />
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
                path="/mlbb-diamonds"
                element={
                  <ProtectedRoute>
                    <MLBBDiamonds />
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
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <ProtectedAdminRoute>
                    <ProductsManage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/products/new"
                element={
                  <ProtectedAdminRoute>
                    <ProductNew />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/diamond-packages"
                element={
                  <ProtectedAdminRoute>
                    <DiamondPackages />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/diamond-packages/new"
                element={
                  <ProtectedAdminRoute>
                    <DiamondPackageForm />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/diamond-packages/edit/:id"
                element={
                  <ProtectedAdminRoute>
                    <DiamondPackageForm />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/photos"
                element={
                  <ProtectedAdminRoute>
                    <PhotosManage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/photos/new"
                element={
                  <ProtectedAdminRoute>
                    <PhotoNew />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <ProtectedAdminRoute>
                    <OrdersManage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedAdminRoute>
                    <UsersManage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/withdrawal-settings"
                element={
                  <ProtectedAdminRoute>
                    <WithdrawalSettings />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/withdrawal-items"
                element={
                  <ProtectedAdminRoute>
                    <WithdrawalItemsManage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/premium-users"
                element={
                  <ProtectedAdminRoute>
                    <PremiumUsersManage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/admin/premium-plans"
                element={
                  <ProtectedAdminRoute>
                    <PremiumPlansManage />
                  </ProtectedAdminRoute>
                }
              />
              <Route
                path="/premium-history"
                element={
                  <ProtectedRoute>
                    <PremiumHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/premium-shop"
                element={
                  <ProtectedRoute>
                    <PremiumShop />
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
              <Route
                path="/point-history"
                element={
                  <ProtectedRoute>
                    <PointHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/top-earners"
                element={
                  <ProtectedRoute>
                    <TopEarners />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:recipientId"
                element={
                  <ProtectedRoute>
                    <Chat />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat-list"
                element={
                  <ProtectedRoute>
                    <ChatList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/explore-users"
                element={
                  <ProtectedRoute>
                    <ExploreUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile/:userId"
                element={
                  <ProtectedRoute>
                    <PublicProfile />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </GlobalMessageNotificationProvider>
            </OnlineUsersProvider>
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
