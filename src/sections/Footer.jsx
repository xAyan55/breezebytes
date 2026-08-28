import { socials } from "../constants/index.jsx";

const Footer = () => {
  return (
    <footer className="border-t border-s3/40 bg-s1">
      <div className="container py-10">
        <div className="flex w-full items-center max-md:flex-col max-md:gap-6">
          <div className="flex flex-1 items-center gap-3 max-md:justify-center">
            <img
              src="/images/breeze-logo.png"
              width={32}
              height={32}
              alt="BreezeBytes"
              className="object-contain"
            />
            <div className="small-compact">
              <p className="font-bold text-p4 text-sm">BreezeBytes</p>
              <p className="opacity-70 text-xs text-p5">
                Free Minecraft hosting made simple.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:mx-auto">
            <a
              href="#hero"
              className="legal-after relative mr-9 text-p5 text-sm transition-all duration-500 hover:text-p1 cursor-pointer"
            >
              Privacy Policy
            </a>
            <a
              href="#hero"
              className="text-p5 text-sm transition-all duration-500 hover:text-p1 cursor-pointer"
            >
              Terms of Service
            </a>
          </div>

          <div className="flex flex-1 items-center justify-end max-md:justify-center gap-6">
            <p className="small-compact opacity-60 text-p5 max-lg:hidden text-xs">
              © 2026 BreezeBytes. All rights reserved.
            </p>
            <ul className="flex justify-center gap-3">
              {socials.map(({ id, url, icon, title }) => (
                <li key={id}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="social-icon"
                    aria-label={title}
                  >
                    <img
                      src={icon}
                      alt={title}
                      className="size-1/3 object-contain"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
