import { Link as LinkScroll } from "react-scroll";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import clsx from "clsx";

const Header = () => {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 32);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const NavLink = ({ title, to }) => {
    const target = to || title;
    return (
      <LinkScroll
        onClick={() => setIsOpen(false)}
        to={target}
        offset={-100}
        spy
        smooth
        activeClass="nav-active"
        className="base-bold text-p4 uppercase transition-colors duration-500 cursor-pointer hover:text-p1 max-lg:my-4 max-lg:h5"
      >
        {title}
      </LinkScroll>
    );
  };

  return (
    <header
      className={clsx(
        "fixed top-0 left-0 z-50 w-full py-10 transition-all duration-500",
        hasScrolled && "py-2 bg-black-100 backdrop-blur-[8px]",
      )}
    >
      <div className="container flex h-14 items-center max-lg:px-5">
        <LinkScroll
          to="hero"
          offset={-250}
          spy
          smooth
          onClick={() => setIsOpen(false)}
          className="lg:hidden flex items-center gap-3 flex-1 cursor-pointer z-2"
        >
          <img
            src="/images/breeze-logo.png"
            width={40}
            height={40}
            alt="BreezeBytes"
            className="object-contain"
          />
          <span className="font-poppins font-bold text-lg tracking-wider text-p4">
            Breeze<span className="text-p1">Bytes</span>
          </span>
        </LinkScroll>

        <div
          className={clsx(
            "w-full max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:w-full max-lg:bg-s2 max-lg:opacity-0",
            isOpen ? "max-lg:opacity-100" : "max-lg:pointer-events-none",
          )}
        >
          <div className="w-full max-lg:relative max-lg:flex max-lg:flex-col max-lg:min-h-screen max-lg:p-6 max-lg:overflow-hidden sidebar-before max-md:px-4">
            <nav className="max-lg:relative max-lg:z-2 max-lg:my-auto">
              <ul className="flex max-lg:block max-lg:px-12">
                <li className="nav-li">
                  <NavLink title="features" to="features" />
                  <div className="dot" />
                  <NavLink title="free hosting" to="pricing" />
                </li>
                <li className="nav-logo">
                  <LinkScroll
                    to="hero"
                    offset={-250}
                    spy
                    smooth
                    className="max-lg:hidden flex items-center gap-3 transition-transform duration-500 cursor-pointer hover:scale-105"
                  >
                    <img
                      src="/images/breeze-logo.png"
                      width={48}
                      height={48}
                      alt="BreezeBytes Logo"
                      className="object-contain"
                    />
                    <span className="font-poppins font-bold text-xl tracking-wider text-p4">
                      Breeze<span className="text-p1">Bytes</span>
                    </span>
                  </LinkScroll>
                </li>
                <li className="nav-li">
                  <NavLink title="faq" to="faq" />
                  <div className="dot" />
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="base-bold text-p4 uppercase transition-colors duration-500 cursor-pointer hover:text-p1 max-lg:my-4 max-lg:h5"
                  >
                    Sign In
                  </Link>
                  <div className="dot" />
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="base-bold text-p1 uppercase transition-colors duration-500 cursor-pointer hover:text-p4 max-lg:my-4 max-lg:h5"
                  >
                    Get Started
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="lg:hidden block absolute top-1/2 left-0 w-[960px] h-[380px] translate-x-[-290px] -translate-y-1/2 rotate-90">
              <img
                src="/images/bg-outlines.svg"
                width={960}
                height={380}
                alt="outline"
                className="relative z-2 opacity-15"
              />
              <img
                src="/images/bg-outlines-fill.png"
                width={960}
                height={380}
                alt="outline"
                className="absolute inset-0 mix-blend-soft-light opacity-5"
              />
            </div>
          </div>
        </div>

        <button
          className="lg:hidden z-2 size-10 border-2 border-s4/25 rounded-full flex justify-center items-center"
          onClick={() => setIsOpen((prevState) => !prevState)}
          aria-label="Toggle navigation menu"
        >
          <img
            src={`/images/${isOpen ? "close" : "magic"}.svg`}
            alt="menu"
            className="size-1/2 object-contain"
          />
        </button>
      </div>
    </header>
  );
};
export default Header;
