import { Element, Link as LinkScroll } from "react-scroll";
import { Link } from "react-router-dom";
import Button from "../components/Button.jsx";

const Hero = () => {
  return (
    <section className="relative pt-60 pb-40 max-lg:pt-52 max-lg:pb-36 max-md:pt-36 max-md:pb-32">
      <Element name="hero">
        <div className="container">
          <div className="relative z-2 max-w-512 max-lg:max-w-388">
            <div className="caption small-2 uppercase text-p3">
              BreezeBytes Hosting
            </div>
            <h1 className="mb-6 h1 text-p4 uppercase max-lg:mb-2 max-lg:h2 max-md:mb-4 max-md:text-5xl max-md:leading-12">
              Free Minecraft Hosting. Made Simple.
            </h1>
            <p className="max-w-440 mb-14 body-1 max-md:mb-10 text-p5">
              Create your Minecraft server for free with BreezeBytes and get
              everything you need to start playing.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/register">
                <Button icon="/images/zap.svg">Get Started Free</Button>
              </Link>
              <LinkScroll to="features" offset={-100} spy smooth>
                <Button icon="/images/docs.svg">Learn More</Button>
              </LinkScroll>
            </div>
          </div>

          <div className="absolute -top-32 left-[calc(50%-340px)] w-[1230px] hero-img_res pointer-events-none">
            <img
              src="/images/hero.png"
              className="size-1230 max-lg:h-auto opacity-60 mix-blend-lighten"
              alt="hero graphic"
            />
          </div>
        </div>
      </Element>
    </section>
  );
};
export default Hero;
