import { useEffect, useRef, type ReactNode } from 'react';
import { ClerkProvider, Show, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { DummyAssetProvider, Workspace, Landing } from '@/pages/app-pages';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const staticWebOnly = import.meta.env.VITE_STATIC_WEB_ONLY === 'true';
const clerkPubKey = staticWebOnly ? '' : publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const appearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#1775f7',
    colorForeground: '#172c4b',
    colorMutedForeground: '#64748b',
    colorDanger: '#cc3345',
    colorBackground: '#ffffff',
    colorInput: '#f6f8fb',
    colorInputForeground: '#172c4b',
    colorNeutral: '#dbe3ee',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#172c4b] font-bold',
    headerSubtitle: 'text-[#64748b]',
    socialButtonsBlockButtonText: 'text-[#172c4b] font-semibold',
    formFieldLabel: 'text-[#253b59] font-semibold',
    footerActionLink: 'text-[#126be6] font-semibold',
    footerActionText: 'text-[#64748b]',
    dividerText: 'text-[#64748b]',
    identityPreviewEditButton: 'text-[#126be6]',
    formFieldSuccessText: 'text-emerald-700',
    alertText: 'text-[#253b59]',
    logoBox: 'rounded-lg overflow-hidden',
    logoImage: 'object-contain',
    socialButtonsBlockButton: 'border border-[#dbe3ee] rounded-xl',
    formButtonPrimary: 'bg-[#176ff0] hover:bg-[#0d5fd7] rounded-xl',
    formFieldInput: 'border-[#dbe3ee] bg-[#f6f8fb] rounded-xl text-[#172c4b]',
    footerAction: 'text-[#64748b]',
    dividerLine: 'bg-[#dbe3ee]',
    alert: 'rounded-xl',
    otpCodeFieldInput: 'border-[#dbe3ee] rounded-lg',
    formFieldRow: 'gap-1',
    main: 'gap-4',
  },
};

function QueryCacheSync() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previous.current !== undefined && previous.current !== userId) client.clear();
      previous.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function AuthFrame({ children }: { children: ReactNode }) {
  return <main className="min-h-[100dvh] bg-[#f2f6fb] px-4 py-12"><div className="mx-auto mb-8 flex max-w-md items-center justify-between"><Link href="/" className="flex items-center gap-3 font-display text-xl font-extrabold text-[#142d50]" data-testid="link-auth-logo"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#176ff0] text-sm font-bold text-white">D</span> AdPilot</Link><span className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Simple campaign workspace</span></div>{children}</main>;
}

function SignInPage() {
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
}
function SignUpPage() {
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>;
}

function HomeRoute() {
  return <><Show when="signed-in"><Redirect to="/dashboard" /></Show><Show when="signed-out"><Landing /></Show></>;
}
function ProtectedWorkspace() {
  return <><Show when="signed-in"><Workspace /></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={HomeRoute} />
    <Route path="/sign-in/*?" component={SignInPage} />
    <Route path="/sign-up/*?" component={SignUpPage} />
    <Route path="/dashboard"><ProtectedWorkspace /></Route>
    <Route path="/campaigns/new"><ProtectedWorkspace /></Route>
    <Route path="/campaigns/:campaignId"><ProtectedWorkspace /></Route>
    <Route path="/campaigns"><ProtectedWorkspace /></Route>
    <Route path="/media"><ProtectedWorkspace /></Route>
    <Route path="/business"><ProtectedWorkspace /></Route>
    <Route path="/connections"><ProtectedWorkspace /></Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}

function ClerkAppContents() {
  const { userId } = useAuth();
  return <QueryClientProvider client={queryClient}><DummyAssetProvider userId={userId ?? null}><QueryCacheSync /><TooltipProvider><Router /><Toaster /></TooltipProvider></DummyAssetProvider></QueryClientProvider>;
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={appearance}
    signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{signIn:{start:{title:'Welcome back',subtitle:'Sign in to your AdPilot workspace'}},signUp:{start:{title:'Create your AdPilot account',subtitle:'Start with the details you already know'}}}}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}>
    <ClerkAppContents />
  </ClerkProvider>;
}

function App() {
  if (staticWebOnly) return <WouterRouter base={basePath}><Landing staticMode /></WouterRouter>;
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
  return <WouterRouter base={basePath}><ClerkRoutes /></WouterRouter>;
}

export default App;
