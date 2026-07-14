const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  if (!validateEmail(email)) {
    toast({ title: "Invalid Email", variant: "destructive" });
    setLoading(false);
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    toast({
      title: "Invalid Password",
      description: passwordError,
      variant: "destructive",
    });
    setLoading(false);
    return;
  }

  if (password !== confirmPassword) {
    toast({
      title: "Passwords don't match",
      variant: "destructive",
    });
    setLoading(false);
    return;
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    toast({
      title: "Enter your name",
      variant: "destructive",
    });
    setLoading(false);
    return;
  }

  const trimmedRef = (referralCode || "").trim();

  try {

    // 1. Create Auth User
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: trimmedName,
          referral_code: trimmedRef || null,
        },
      },
    });


    if (error) {
      throw error;
    }


    const user = data.user;

    if (!user) {
      throw new Error("User creation failed");
    }


    // 2. Create Profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        name: trimmedName,
        email: email,
        referral_code: trimmedRef || null,
      });


    if (profileError) {
      console.log(profileError);
      throw profileError;
    }


    // 3. Upload Avatar
    if (avatarFile) {

      const url = await uploadAvatar(user.id);

      if (url) {

        const { error: avatarError } = await supabase
          .from("profiles")
          .update({
            avatar_url: url,
          })
          .eq("id", user.id);


        if (avatarError) {
          throw avatarError;
        }
      }
    }


    toast({
      title: "Welcome aboard! 🎉",
      description: "Your account is ready",
    });


    navigate("/", {
      replace: true,
    });


  } catch (error: any) {

    console.log("SIGNUP ERROR:", error);

    toast({
      title: "Signup Failed",
      description: error.message,
      variant: "destructive",
    });

  } finally {

    setLoading(false);

  }
};
