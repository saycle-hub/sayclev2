import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <AppLogoIcon className="aspect-square size-9" />
            <div className="ml-1.5 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-bold text-white text-base tracking-wide">SayCle</span>
            </div>
        </>
    );
}
