import { Link } from "react-router-dom";

const AuthBranding = () => {
  return (
    <div className="relative w-full h-full min-h-[280px] lg:min-h-screen overflow-hidden flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-s1 select-none">
      {/* Background Minecraft Artwork */}
      <img
        src="/images/auth.jpg"
        alt="BreezeBytes Minecraft Landscape"
        className="absolute inset-0 w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000"
      />

      {/* Subtle dark gradient overlay to harmonize with theme */}
      <div className="absolute inset-0 bg-gradient-to-t from-s1 via-s1/40 to-s1/25" />
      <div className="absolute inset-0 bg-s1/20" />

      {/* Top Branding */}
      <div className="relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-3 group transition-transform duration-300 hover:scale-[1.02]"
          aria-label="BreezeBytes Home"
        >
          <img
            src="/images/breeze-logo.png"
            width={44}
            height={44}
            alt="BreezeBytes Logo"
            className="object-contain drop-shadow-lg"
          />
          <span className="font-poppins font-bold text-xl tracking-wider text-p4">
            Breeze<span className="text-p1">Bytes</span>
          </span>
        </Link>
      </div>

      {/* Bottom Tagline & Verified Highlight */}
      <div className="relative z-10 max-w-md">
        <div className="inline-block px-3 py-1 rounded-full bg-s1/60 border border-s3/60 backdrop-blur-md mb-3">
          <span className="small-compact uppercase tracking-widest text-p1 text-[11px]">
            Official Minecraft Hosting
          </span>
        </div>

        <h2 className="h4 text-p4 font-bold tracking-tight mb-2">
          Free Minecraft hosting, made simple.
        </h2>

        <p className="text-sm text-p5/80 leading-relaxed">
          Create, manage, and play on your server in minutes with reliable
          resources and full control panel access.
        </p>
      </div>
    </div>
  );
};

export default AuthBranding;
