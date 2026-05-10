import { useState, useEffect, lazy, Suspense } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import OfflineGame from "@/components/OfflineGame";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MusicProvider } from "@/contexts/MusicContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute";
import LoadingScreen from "@/components/LoadingScreen";


// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Photo = lazy(() => import("./pages/Photo"));
const Favourite = lazy(() => import("./pages/Favourite"));
const Account = lazy(() => import("./pages/Account"));
const AIChat = lazy(() => import("./pages/AIChat"));
const AIHub = lazy(() => import("./pages/AIHub"));
const AIPhoto = lazy(() => import("./pages/AIPhoto"));
const AIInvitation = lazy(() => import("./pages/AIInvitation"));
const AIGift = lazy(() => import("./pages/AIGift"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const PhotoDetail = lazy(() => import("./pages/PhotoDetail"));
const CategoryProducts = lazy(() => import("./pages/CategoryProducts"));
const GamePage = lazy(() => import("./pages/GamePage"));
const GamesPortal = lazy(() => import("./pages/GamesPortal"));
const Terms = lazy(() => import("./pages/Terms"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Exchange = lazy(() => import("./pages/Exchange"));
const Cart = lazy(() => import("./pages/Cart"));
const PointHistory = lazy(() => import("./pages/PointHistory"));
const TopEarners = lazy(() => import("./pages/TopEarners"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));

const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy load admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ProductsManage = lazy(() => import("./pages/admin/ProductsManage"));
const ProductNew = lazy(() => import("./pages/admin/ProductNew"));
const DiamondPackages = lazy(() => import("./pages/admin/DiamondPackages"));
const DiamondPackageForm = lazy(() => import("./pages/admin/DiamondPackageForm"));
const PhotosManage = lazy(() => import("./pages/admin/PhotosManage"));
const PhotoNew = lazy(() => import("./pages/admin/PhotoNew"));
const OrdersManage = lazy(() => import("./pages/admin/OrdersManage"));
const UsersManage = lazy(() => import("./pages/admin/UsersManage"));
const WithdrawalSettings = lazy(() => import("./pages/admin/WithdrawalSettings"));
const WithdrawalItemsManage = lazy(() => import("./pages/admin/WithdrawalItemsManage"));
const PremiumUsersManage = lazy(() => import("./pages/admin/PremiumUsersManage"));
const PremiumPlansManage = lazy(() => import("./pages/admin/PremiumPlansManage"));
const PremiumRequestsManage = lazy(() => import("./pages/admin/PremiumRequestsManage"));
const ReportsManage = lazy(() => import("./pages/admin/ReportsManage"));
const CategoriesManage = lazy(() => import("./pages/admin/CategoriesManage"));
const ProductCategoriesManage = lazy(() => import("./pages/admin/ProductCategoriesManage"));
const PhysicalCategoriesManage = lazy(() => import("./pages/admin/PhysicalCategoriesManage"));
const DepositsManage = lazy(() => import("./pages/admin/DepositsManage"));
const WalletManage = lazy(() => import("./pages/admin/WalletManage"));
const BannersManage = lazy(() => import("./pages/admin/BannersManage"));
const MobileOperatorsManage = lazy(() => import("./pages/admin/MobileOperatorsManage"));
const MobileServicesManage = lazy(() => import("./pages/admin/MobileServicesManage"));
const PaymentMethodsManage = lazy(() => import("./pages/admin/PaymentMethodsManage"));
const BackgroundMusicManage = lazy(() => import("./pages/admin/BackgroundMusicManage"));
const AdsManage = lazy(() => import("./pages/admin/AdsManage"));
const PubgUcPackages = lazy(() => import("./pages/admin/PubgUcPackages"));
const PubgUcPackageForm = lazy(() => import("./pages/admin/PubgUcPackageForm"));
const ApiSettings = lazy(() => import("./pages/admin/ApiSettings"));
const NotificationsManage = lazy(() => import("./pages/admin/NotificationsManage"));
const GamePointsManage = lazy(() => import("./pages/admin/GamePointsManage"));
const AIDashboard = lazy(() => import("./pages/admin/AIDashboard"));
const WalletHistory = lazy(() => import("./pages/WalletHistory"));
const TopUp = lazy(() => import("./pages/TopUp"));
const PhysicalProducts = lazy(() => import("./pages/PhysicalProducts"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));
import InterstitialAd from "@/components/InterstitialAd";
import NotificationDialog from "@/components/NotificationDialog";

const queryClient = new QueryClient();

// Suspense fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => {
  const [showLoading, setShowLoading] = useState(true);
  const isOnline = useNetworkStatus();

  // Sync offline game scores when coming back online
  useEffect(() => {
    if (!isOnline) return;
    const syncOfflineScores = async () => {
      const pending = JSON.parse(localStorage.getItem("kaung_offline_pending_scores") || "[]");
      if (pending.length === 0) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      let totalPoints = 0;
      for (const entry of pending) {
        const points = Math.min(Math.floor(entry.score / 10), 50); // max 50 pts per game
        if (points > 0) {
          totalPoints += points;
          await supabase.from("game_scores").insert({
            user_id: user.id,
            game_name: "Offline Runner",
            score: entry.score,
            is_win: entry.score >= 100,
            points_earned: points,
          });
        }
      }
      if (totalPoints > 0) {
        await supabase.rpc("get_daily_game_points", { p_user_id: user.id }); // just to validate
        await supabase.from("profiles").update({ 
          game_points: totalPoints 
        }).eq("id", user.id);
      }
      localStorage.removeItem("kaung_offline_pending_scores");
    };
    syncOfflineScores();
  }, [isOnline]);

  if (!isOnline) {
    return <OfflineGame />;
  }

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
              <MusicProvider>
              <InterstitialAd />
              <NotificationDialog />
              <Suspense fallback={<PageLoader />}>
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
                <Route path="/ai" element={<ProtectedRoute><AIHub /></ProtectedRoute>} />
                <Route path="/ai/photo" element={<ProtectedRoute><AIPhoto /></ProtectedRoute>} />
                <Route path="/ai/invitation" element={<ProtectedRoute><AIInvitation /></ProtectedRoute>} />
                <Route path="/ai/gift" element={<ProtectedRoute><AIGift /></ProtectedRoute>} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/photo/:id" element={<PhotoDetail />} />
                <Route
                  path="/category/:category"
                  element={
                    <ProtectedRoute>
                      <CategoryProducts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/game"
                  element={
                    <ProtectedRoute>
                      <GamePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games"
                  element={
                    <ProtectedRoute>
                      <GamesPortal />
                    </ProtectedRoute>
                  }
                />
                <Route path="/terms" element={<Terms />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<About />} />
                <Route path="/privacy" element={<Privacy />} />
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
                  path="/admin/categories"
                  element={
                    <ProtectedAdminRoute>
                      <CategoriesManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/product-categories"
                  element={
                    <ProtectedAdminRoute>
                      <ProductCategoriesManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/physical-categories"
                  element={
                    <ProtectedAdminRoute>
                      <PhysicalCategoriesManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/physical-products"
                  element={
                    <ProtectedRoute>
                      <PhysicalProducts />
                    </ProtectedRoute>
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
                  path="/admin/pubg-uc-packages"
                  element={
                    <ProtectedAdminRoute>
                      <PubgUcPackages />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/pubg-uc-packages/new"
                  element={
                    <ProtectedAdminRoute>
                      <PubgUcPackageForm />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/pubg-uc-packages/edit/:id"
                  element={
                    <ProtectedAdminRoute>
                      <PubgUcPackageForm />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/api-settings"
                  element={
                    <ProtectedAdminRoute>
                      <ApiSettings />
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
                  path="/admin/premium-requests"
                  element={
                    <ProtectedAdminRoute>
                      <PremiumRequestsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/reports"
                  element={
                    <ProtectedAdminRoute>
                      <ReportsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/deposits"
                  element={
                    <ProtectedAdminRoute>
                      <DepositsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/wallets"
                  element={
                    <ProtectedAdminRoute>
                      <WalletManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/banners"
                  element={
                    <ProtectedAdminRoute>
                      <BannersManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/mobile-operators"
                  element={
                    <ProtectedAdminRoute>
                      <MobileOperatorsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/mobile-services"
                  element={
                    <ProtectedAdminRoute>
                      <MobileServicesManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/payment-methods"
                  element={
                    <ProtectedAdminRoute>
                      <PaymentMethodsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/background-music"
                  element={
                    <ProtectedAdminRoute>
                      <BackgroundMusicManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/ads"
                  element={
                    <ProtectedAdminRoute>
                      <AdsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/notifications"
                  element={
                    <ProtectedAdminRoute>
                      <NotificationsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/game-points"
                  element={
                    <ProtectedAdminRoute>
                      <GamePointsManage />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/admin/ai"
                  element={
                    <ProtectedAdminRoute>
                      <AIDashboard />
                    </ProtectedAdminRoute>
                  }
                />
                <Route
                  path="/wallet-history"
                  element={
                    <ProtectedRoute>
                      <WalletHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/top-up"
                  element={
                    <ProtectedRoute>
                      <TopUp />
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
                  path="/profile/:userId"
                  element={
                    <ProtectedRoute>
                      <PublicProfile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/transaction-history"
                  element={
                    <ProtectedRoute>
                      <TransactionHistory />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </MusicProvider>
            </LanguageProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;