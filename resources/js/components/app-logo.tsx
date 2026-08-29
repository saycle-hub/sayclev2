import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <AppLogoIcon className="aspect-square size-8" />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold text-[#18352a]">SayCle</span>
            </div>
        </>
    );
}
