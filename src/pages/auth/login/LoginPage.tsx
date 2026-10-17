import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import orthoLogo from "@/assets/images/logo_uns_ortho.png";
import { useAuthStore } from "@/store/authStore";
import { ROUTES } from "@/utils/routes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { icons } from "@/assets/images/Icon";
import { InputField } from "@/components/fields/inputField";
import { PasswordField } from "@/components/fields/passwordField";
import { loginSchema, LoginFormData } from "@/validations/auth/login";
import { LeftColumn } from "./_components/LeftColumn";
import { showToast } from "@/utils/toast";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuthStore();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: true,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const success = await login(data);

    if (success) {
      const successMessage = useAuthStore.getState().success;
      showToast(successMessage ?? "Login berhasil", "success", {
        duration: 3000,
      });
      navigate(ROUTES.dashboard);
    } else {
      const errorMessage = useAuthStore.getState().error;
      showToast(errorMessage ?? "Login gagal", "error", { duration: 4000 });
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Column - Image Section (hidden on mobile) */}
      <LeftColumn />

      {/* Right Column - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo (visible only on mobile) */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <img
              src={orthoLogo}
              alt="Logo UNS Orthopaedi"
              className="h-20 w-20 object-contain"
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-3xl font-bold leading-none tracking-tight text-[#04563D]">
                MEDIC LINK
              </span>
              <span className="text-sm font-semibold uppercase leading-none tracking-[0.22em] text-[#087F5B]">
                LOGBOOK
              </span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
              Masuk
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              Silakan masukkan kredensial Anda untuk mengakses akun
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-[#FFF5F2] border border-[#FFC9BD] rounded-lg">
              <p className="text-sm text-[#D95D43]">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Username Field */}
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <InputField
                  {...field}
                  label="Username"
                  placeholder="Masukkan username"
                  startIcon={<icons.User className="h-5 w-5 text-gray-400" />}
                  errorMessage={errors.username?.message}
                />
              )}
            />

            {/* Password Field */}
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <PasswordField
                  {...field}
                  label="Password"
                  placeholder="Masukkan password"
                  startIcon={<icons.Lock className="h-5 w-5 text-gray-400" />}
                  errorMessage={errors.password?.message}
                />
              )}
            />

            {/* Remember Me & Forgot Password */}
            <div className="items-center justify-between hidden">
              <Controller
                name="rememberMe"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="rememberMe"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-sm text-gray-600 font-normal cursor-pointer"
                    >
                      Ingat saya
                    </label>
                  </div>
                )}
              />
              <a
                href="#"
                className="text-sm text-[#0062A3] hover:text-[#003A6B] font-medium"
              >
                Lupa password?
              </a>
            </div>

            {/* Login Button */}
            <Button type="submit" disabled={isLoading} className="w-full py-3">
              {isLoading ? "Memuat..." : "Masuk"}
            </Button>
          </form>

          {/* Footer Text */}
          <p className="text-center text-xs sm:text-sm text-gray-400 mt-8">
            &copy; {new Date().getFullYear()} Logbook PPDS. Hak cipta
            dilindungi.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
