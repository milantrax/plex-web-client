import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './theme/ThemeContext';
import { getAppConfig } from './api/configApi';

jest.mock('./api/configApi');
const mockedGetAppConfig = getAppConfig as jest.MockedFunction<typeof getAppConfig>;

const mockUseAuth = jest.fn();
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}));

function renderApp() {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

beforeEach(() => {
  // create-react-app runs jest with resetMocks, so the return values have to be
  // set per test rather than once in the module factory.
  mockedGetAppConfig.mockResolvedValue({ defaultTheme: 'system' });
  window.history.pushState({}, '', '/');
});

test('shows a loading indicator while the session is being resolved', () => {
  mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: true });
  renderApp();
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});

test('sends an unauthenticated visitor to the sign-in screen', async () => {
  mockUseAuth.mockReturnValue({ isAuthenticated: false, loading: false });
  renderApp();

  expect(await screen.findByText('Sign in to your account')).toBeInTheDocument();
  // Sign-in is by email address, not username.
  expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/^Username/i)).not.toBeInTheDocument();
});
