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
  
  // Chat
  chat: { en: "Chat", my: "ချက်တင်" },
  typeMessage: { en: "Type a message...", my: "မက်ဆေ့ချ်ရိုက်ပါ..." },
  deleteMessage: { en: "Delete Message", my: "မက်ဆေ့ချ်ဖျက်ရန်" },
  noMessages: { en: "No messages yet", my: "မက်ဆေ့ချ်မရှိသေးပါ" },
  startConversation: { en: "Start a conversation", my: "စကားပြောဆိုမှုစတင်ပါ" },
  
  // Profile
  viewProfile: { en: "View Profile", my: "ပရိုဖိုင်ကြည့်ရန်" },
  memberSince: { en: "Member Since", my: "အဖွဲ့ဝင်ဖြစ်သည်မှ" },
  verified: { en: "Verified", my: "အတည်ပြုပြီး" },
  sendMessage: { en: "Send Message", my: "မက်ဆေ့ချ်ပို့ရန်" },
  
  // Common
  loading: { en: "Loading...", my: "ဖွင့်နေသည်..." },
  search: { en: "Search", my: "ရှာဖွေရန်" },
  cancel: { en: "Cancel", my: "ပယ်ဖျက်ရန်" },
  confirm: { en: "Confirm", my: "အတည်ပြုရန်" },
  save: { en: "Save", my: "သိမ်းဆည်းရန်" },
  online: { en: "Online", my: "အွန်လိုင်း" },
  offline: { en: "Offline", my: "အော့ဖ်လိုင်း" },
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
