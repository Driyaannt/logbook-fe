import orthoLogo from "@/assets/images/logo_uns_ortho.png";
import medicine from "@/assets/images/medicine.svg";

export const LeftColumn = () => {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-[#087F5B] to-[#04563D] flex-col items-center justify-center p-12">
      <div className="flex flex-col items-center justify-center h-full">
        <div className="flex items-center gap-4">
          <img
            src={orthoLogo}
            alt="Logo UNS Orthopaedi"
            className="h-24 w-24 object-contain"
          />
          <div className="flex flex-col gap-2">
            <span className="text-5xl font-bold leading-none tracking-tight text-white">
              Logbook
            </span>
            <span className="text-md font-semibold uppercase leading-none tracking-[0.22em] text-emerald-100">
              Medlink
            </span>
          </div>
        </div>

        {/* Login Icon */}
        <div className="mt-4">
          <img
            src={medicine}
            alt="Ilustrasi tenaga medis"
            className="w-96 max-w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
};
