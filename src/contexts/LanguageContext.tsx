import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Language = "en" | "my";

interface Translations {
  [key: string]: { en: string; my: string };
}

const translations: Translations = {
  // Navigation
  home: { en: "Home", my: "ပင်မစာမျက်နှာ" },
  photos: { en: "Photos", my: "ဓာတ်ပုံများ" },
  favourites: { en: "Favourites", my: "နှစ်သက်ရာများ" },
  account: { en: "Account", my: "အကောင့်" },
  
  // Account page
  yourPoints: { en: "Your Points", my: "သင့်အမှတ်များ" },
  totalPoints: { en: "Total Points", my: "စုစုပေါင်းအမှတ်" },
  dailySpin: { en: "Daily Spin", my: "နေ့စဉ်လှည့်ခြင်း" },
  exchange: { en: "Exchange", my: "လဲလှယ်ရန်" },
  topEarners: { en: "Top Earners", my: "ထိပ်တန်းရရှိသူများ" },
  history: { en: "History", my: "မှတ်တမ်း" },
  pointHistory: { en: "Point History", my: "အမှတ်မှတ်တမ်း" },
  orderHistory: { en: "Order History", my: "အော်ဒါမှတ်တမ်း" },
  redeemHistory: { en: "Redeem/Withdrawal History", my: "ထုတ်ယူမှုမှတ်တမ်း" },
  profileInfo: { en: "Profile Information", my: "ပရိုဖိုင်အချက်အလက်" },
  name: { en: "Name", my: "အမည်" },
  phoneNumber: { en: "Phone Number", my: "ဖုန်းနံပါတ်" },
  changePassword: { en: "Change Password", my: "စကားဝှက်ပြောင်းရန်" },
  currentPassword: { en: "Current Password", my: "လက်ရှိစကားဝှက်" },
  newPassword: { en: "New Password", my: "စကားဝှက်အသစ်" },
  confirmPassword: { en: "Confirm New Password", my: "စကားဝှက်အသစ်အတည်ပြုပါ" },
  aiAssistant: { en: "AI Assistant", my: "AI အကူအညီ" },
  adminDashboard: { en: "Admin Dashboard", my: "စီမံခန့်ခွဲမှု" },
  termsPolicy: { en: "Terms & Policy", my: "စည်းမျဉ်းများ" },
  contactUs: { en: "Contact Us", my: "ဆက်သွယ်ရန်" },
  logout: { en: "Logout", my: "ထွက်ရန်" },
  settings: { en: "Settings", my: "ဆက်တင်များ" },
  language: { en: "Language", my: "ဘာသာစကား" },
  messages: { en: "Messages", my: "မက်ဆေ့ချ်များ" },
  
  // Profile tabs
  profile: { en: "Profile", my: "ပရိုဖိုင်" },
  security: { en: "Security", my: "လုံခြုံရေး" },
  billing: { en: "Billing", my: "ငွေပေးချေမှု" },
  preferences: { en: "Preferences", my: "ရွေးချယ်မှုများ" },
  
  // Profile section
  profilePicture: { en: "Profile Picture", my: "ပရိုဖိုင်ဓာတ်ပုံ" },
  personalInformation: { en: "Personal Information", my: "ကိုယ်ရေးအချက်အလက်" },
  editName: { en: "Edit Name", my: "အမည်ပြင်ရန်" },
  editPhone: { en: "Edit Phone", my: "ဖုန်းပြင်ရန်" },
  premiumOnlyNameChange: { en: "Premium members only", my: "ပရီမီယံအဖွဲ့ဝင်များသာ" },
  
  // Security section
  dangerZone: { en: "Danger Zone", my: "အန္တရာယ်ဇုန်" },
  deleteAccount: { en: "Delete Account", my: "အကောင့်ဖျက်ရန်" },
  deleteAccountWarning: { en: "Once you delete your account, there is no going back.", my: "အကောင့်ဖျက်လိုက်ပြီဆိုရင် ပြန်မရနိုင်တော့ပါ။" },
  
  // Billing section
  premiumStatus: { en: "Premium Status", my: "ပရီမီယံအခြေအနေ" },
  premiumMember: { en: "Premium Member", my: "ပရီမီယံအဖွဲ့ဝင်" },
  freeMember: { en: "Free Member", my: "အခမဲ့အဖွဲ့ဝင်" },
  premiumShop: { en: "Premium Shop", my: "ပရီမီယံဆိုင်" },
  premiumHistory: { en: "Premium History", my: "ပရီမီယံမှတ်တမ်း" },
  
  // Preferences section
  theme: { en: "Theme", my: "အပြင်အဆင်" },
  darkMode: { en: "Dark Mode", my: "အမှောင်မုဒ်" },
  notifications: { en: "Notifications", my: "အသိပေးချက်များ" },
  emailNotifications: { en: "Email Notifications", my: "အီးမေးလ်အသိပေးချက်" },
  pushNotifications: { en: "Push Notifications", my: "တွန်းပို့အသိပေးချက်" },
  smsNotifications: { en: "SMS Notifications", my: "SMS အသိပေးချက်" },
  chatSettings: { en: "Chat Settings", my: "ချက်တင်ဆက်တင်များ" },
  referFriend: { en: "Refer a Friend", my: "သူငယ်ချင်းညွှန်းရန်" },
  english: { en: "English", my: "အင်္ဂလိပ်" },
  myanmar: { en: "Myanmar (Burmese)", my: "မြန်မာ" },
  
  // Chat
  chat: { en: "Chat", my: "ချက်တင်" },
  typeMessage: { en: "Type a message...", my: "မက်ဆေ့ချ်ရိုက်ပါ..." },
  deleteMessage: { en: "Delete Message", my: "မက်ဆေ့ချ်ဖျက်ရန်" },
  noMessages: { en: "No messages yet", my: "မက်ဆေ့ချ်မရှိသေးပါ" },
  startConversation: { en: "Start a conversation", my: "စကားပြောဆိုမှုစတင်ပါ" },
  typing: { en: "typing...", my: "ရိုက်နေသည်..." },
  
  // Profile
  viewProfile: { en: "View Profile", my: "ပရိုဖိုင်ကြည့်ရန်" },
  memberSince: { en: "Member Since", my: "အဖွဲ့ဝင်ဖြစ်သည်မှ" },
  verified: { en: "Verified", my: "အတည်ပြုပြီး" },
  sendMessage: { en: "Send Message", my: "မက်ဆေ့ချ်ပို့ရန်" },
  
  // Premium Shop
  subscriptions: { en: "Subscriptions", my: "စာရင်းသွင်းမှုများ" },
  quickBuy: { en: "Quick Buy", my: "အမြန်ဝယ်ရန်" },
  premiumBenefits: { en: "Premium Benefits", my: "ပရီမီယံအကျိုးခံစားခွင့်များ" },
  blueVerifiedMark: { en: "Blue Verified Mark", my: "အပြာရောင်အတည်ပြုတံဆိပ်" },
  customNameChange: { en: "Custom Name Change", my: "အမည်ပြောင်းခွင့်" },
  earnPointsWhileChatting: { en: "Earn points while chatting", my: "ချက်တင်လုပ်ရင်းအမှတ်ရယူပါ" },
  selectPlan: { en: "Select Plan", my: "အစီအစဉ်ရွေးပါ" },
  requestPending: { en: "Request Pending", my: "တောင်းဆိုမှုစောင့်ဆိုင်းဆဲ" },
  confirmPurchase: { en: "Confirm Purchase", my: "ဝယ်ယူမှုအတည်ပြုပါ" },
  phoneForPayment: { en: "Phone Number for Payment", my: "ငွေပေးချေရန်ဖုန်းနံပါတ်" },
  submitRequest: { en: "Submit Request", my: "တောင်းဆိုမှုတင်သွင်းရန်" },
  paymentInstructions: { en: "Payment Instructions", my: "ငွေပေးချေမှုညွှန်ကြားချက်" },
  kpayInstructions: { en: "Send payment to the following KPay number", my: "အောက်ပါ KPay နံပါတ်သို့ငွေလွှဲပါ" },
  wavepayInstructions: { en: "Send payment to the following WavePay number", my: "အောက်ပါ WavePay နံပါတ်သို့ငွေလွှဲပါ" },
  paymentNumber: { en: "Payment Number", my: "ငွေပေးချေမှုနံပါတ်" },
  copyNumber: { en: "Copy Number", my: "နံပါတ်ကူးရန်" },
  afterPayment: { en: "After sending payment, enter your phone number below", my: "ငွေလွှဲပြီးနောက်၊ သင့်ဖုန်းနံပါတ်ကိုအောက်တွင်ထည့်ပါ" },
  
  // Products
  productDetails: { en: "Product Details", my: "ပစ္စည်းအသေးစိတ်" },
  description: { en: "Description", my: "ဖော်ပြချက်" },
  quantity: { en: "Quantity", my: "အရေအတွက်" },
  buyNow: { en: "Buy Now", my: "ယခုဝယ်မည်" },
  addToCart: { en: "Add to Cart", my: "ခြင်းထဲထည့်ရန်" },
  earnPoints: { en: "Earn points", my: "အမှတ်ရရှိမည်" },
  
  // Photos
  photoDetails: { en: "Photo Details", my: "ဓာတ်ပုံအသေးစိတ်" },
  downloadPhotos: { en: "Download Photos", my: "ဓာတ်ပုံများဒေါင်းလုပ်" },
  fileSize: { en: "Size", my: "အရွယ်အစား" },
  shootingDate: { en: "Shooting Date", my: "ရိုက်ကူးသည့်ရက်" },
  
  // Common
  loading: { en: "Loading...", my: "ဖွင့်နေသည်..." },
  search: { en: "Search", my: "ရှာဖွေရန်" },
  cancel: { en: "Cancel", my: "ပယ်ဖျက်ရန်" },
  confirm: { en: "Confirm", my: "အတည်ပြုရန်" },
  save: { en: "Save", my: "သိမ်းဆည်းရန်" },
  online: { en: "Online", my: "အွန်လိုင်း" },
  offline: { en: "Offline", my: "အော့ဖ်လိုင်း" },
  back: { en: "Back", my: "နောက်သို့" },
  close: { en: "Close", my: "ပိတ်ရန်" },
  update: { en: "Update", my: "အပ်ဒိတ်" },
  delete: { en: "Delete", my: "ဖျက်ရန်" },
  edit: { en: "Edit", my: "ပြင်ဆင်ရန်" },
  points: { en: "Points", my: "အမှတ်များ" },
  perMinute: { en: "per minute", my: "တစ်မိနစ်လျှင်" },
  
  // Explore Users
  exploreUsers: { en: "Explore Users", my: "အသုံးပြုသူများရှာဖွေရန်" },
  noUsersFound: { en: "No users found", my: "အသုံးပြုသူမတွေ့ပါ" },
  
  // Friend requests
  addFriend: { en: "Add Friend", my: "သူငယ်ချင်းထည့်ရန်" },
  unfriend: { en: "Unfriend", my: "သူငယ်ချင်းဖြုတ်ရန်" },
  blockUser: { en: "Block User", my: "ပိတ်ပင်ရန်" },
  unblockUser: { en: "Unblock User", my: "ပိတ်ပင်မှုဖြုတ်ရန်" },
  requestSent: { en: "Request Sent", my: "တောင်းဆိုမှုပို့ပြီး" },
  friends: { en: "Friends", my: "သူငယ်ချင်းများ" },
  
  // Reviews
  reviewsRatings: { en: "Reviews & Ratings", my: "သုံးသပ်ချက်များနှင့်အဆင့်သတ်မှတ်ချက်များ" },
  writeReview: { en: "Write a Review", my: "သုံးသပ်ချက်ရေးရန်" },
  noReviews: { en: "No reviews yet", my: "သုံးသပ်ချက်မရှိသေးပါ" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadLanguagePreference();
    }
  }, [user]);

  const loadLanguagePreference = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .single();
    
    if (data?.language) {
      setLanguageState(data.language as Language);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    
    if (user) {
      await supabase
        .from("profiles")
        .update({ language: lang })
        .eq("id", user.id);
    }
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || translation.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
