import { Element } from "react-scroll";
import { Link } from "react-router-dom";
import { links, logos } from "../constants/index.jsx";
import { Marker } from "../components/Marker.jsx";
import Button from "../components/Button.jsx";

const Download = () => {
  return (
    <section>
      <Element
        name="download"
        className="g7 relative pb-32 pt-24 max-lg:pb-24 max-md:py-16"
      >
        <div className="container">
          <div className="flex items-center">
            <div className="relative mr-6 flex-540 max-xl:flex-280 max-lg:flex-256 max-md:flex-100">
              <div className="mb-10 flex items-center gap-3">
                <img
                  src="/images/breeze-logo.png"
                  width={56}
                  height={56}
                  alt="BreezeBytes"
                  className="object-contain"
                />
                <span className="font-poppins font-bold text-2xl tracking-wider text-p4">
                  Breeze<span className="text-p1">Bytes</span>
                </span>
              </div>

              <h2 className="h3 max-md:h5 text-p4 mb-6">
                Ready to Start Your Minecraft Server?
              </h2>

              <p className="body-1 mb-8 max-w-md text-p5">
                Create your free Minecraft server with BreezeBytes today and start
                playing with your community.
              </p>

              <div className="mb-10">
                <Link to="/register">
                  <Button icon="/images/zap.svg">Get Started Free</Button>
                </Link>
              </div>

              <ul className="flex flex-wrap items-center gap-6">
                {links.map(({ id, icon, title }) => (
                  <li
                    key={id}
                    className="download_tech-link download_tech-link_last-before download_tech-link_last-after"
                    title={title}
                  >
                    <Link
                      to="/register"
                      className="size-22 download_tech-icon_before relative flex items-center justify-center rounded-half border-2 border-s3 bg-s1 transition-borderColor duration-500 hover:border-s4"
                    >
                      <span className="absolute -top-2 rotate-90">
                        <Marker />
                      </span>
                      <img
                        src={"/images/lines.svg"}
                        alt="lines"
                        className="absolute size-13/20 object-contain opacity-30"
                      />
                      <span className="download_tech-icon">{icon}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-10 max-md:hidden">
              <div className="download_preview-before download_preview-after rounded-40 relative w-[955px] border-2 border-s5 p-6">
                <div className="relative rounded-3xl bg-s1 px-6 pb-6 pt-14">
                  <span className="download_preview-dot left-6 bg-p2" />
                  <span className="download_preview-dot left-11 bg-s3" />
                  <span className="download_preview-dot left-16 bg-p1/25" />

                  <img
                    src="/images/screen.jpg"
                    width={855}
                    height={655}
                    alt="server preview"
                    className="rounded-xl opacity-80"
                  />
                </div>
              </div>
            </div>
          </div>

          <ul className="mt-24 flex justify-center max-lg:hidden">
            {logos.map(({ id, title }) => (
              <li key={id} className="mx-10 flex items-center justify-center">
                <span className="text-p5 text-sm font-semibold tracking-widest uppercase opacity-70 hover:opacity-100 hover:text-p1 transition-opacity duration-300">
                  {title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Element>
    </section>
  );
};
export default Download;
