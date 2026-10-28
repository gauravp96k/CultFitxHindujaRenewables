import companyLogo from '../../assets/companylogoWhite.svg';
import cultfitLogo from '../../assets/image.png';

/*
 * Header lock-up: company logo (white, sits directly on the navy top bar) + cult.fit logo.
 * image.png is a black logo on a white 320x320 square with lots of padding, so it is shown
 * inside a white chip and cropped with object-fit: cover to the logo's horizontal band.
 */
export default function BrandLogos() {
  return (
    <span className="flex items-center gap-2.5">
      <img src={companyLogo} alt="Hinduja Renewables" className="block h-[30px] w-auto" />
      <span aria-hidden="true" className="h-5 w-px bg-white/40" />
      <span className="flex h-[26px] items-center overflow-hidden rounded-[6px] bg-white px-1">
        <img src={cultfitLogo} alt="cult.fit" className="block h-[30px] w-[64px] object-cover" />
      </span>
    </span>
  );
}
