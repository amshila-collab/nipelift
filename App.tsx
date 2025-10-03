// App.tsx — Single-file drop‑in for Expo/React Native + Supabase Auth
// ---------------------------------------------------------------
// ✅ What this gives you
// - Supabase client (uses EXPO_PUBLIC_* env vars)
// - Session persistence with AsyncStorage
// - AuthProvider + hooks
// - Navigation that switches between Auth stack and App stack
// - Sign In / Sign Up / Home / Account sample screens
// - Example read/update to public.profiles (id uuid = auth.uid())
// ---------------------------------------------------------------

import React, { useEffect, useMemo, useState, createContext, useContext } from 'react'
import { View, Text, TextInput, Button, Alert, ActivityIndicator, TouchableOpacity } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createClient, type Session, type User } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ---------------------------------------------------------------
// 1) Supabase client — uses Expo public env vars
//    Add these to your project .env:
//    EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
//    EXPO_PUBLIC_SUPABASE_KEY=YOUR_ANON_PUBLIC_KEY
// ---------------------------------------------------------------
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('\n[App.tsx] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_KEY in your env.\n')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // RN has no URL bar
  },
})

// ---------------------------------------------------------------
// 2) Auth Context
// ---------------------------------------------------------------

type AuthCtx = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | undefined>(undefined)

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setLoading(false)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => subscription?.subscription?.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading, signIn, signUp, signOut }),
    [session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider/>')
  return ctx
}

// ---------------------------------------------------------------
// 3) Navigation
// ---------------------------------------------------------------
const Stack = createNativeStackNavigator()

function RootNavigator() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="SignIn" component={SignInScreen} options={{ title: 'Sign in' }} />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={{ title: 'Create account' }} />
        </>
      )}
    </Stack.Navigator>
  )
}

// ---------------------------------------------------------------
// 4) Screens — compact but functional
// ---------------------------------------------------------------
function SignInScreen({ navigation }: any) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handle = async () => {
    try {
      await signIn(email.trim(), password)
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message)
    }
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 8 }}>Welcome back</Text>
      <Text>Email</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <Text>Password</Text>
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <Button title="Sign in" onPress={handle} />
      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
        <Text style={{ textAlign: 'center', marginTop: 12 }}>No account? Create one</Text>
      </TouchableOpacity>
    </View>
  )
}

function SignUpScreen({ navigation }: any) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handle = async () => {
    try {
      await signUp(email.trim(), password)
      Alert.alert('Check your inbox', 'Please verify your email to complete signup.')
      navigation.navigate('SignIn')
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message)
    }
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 8 }}>Create account</Text>
      <Text>Email</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <Text>Password</Text>
      <TextInput
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <Button title="Create account" onPress={handle} />
      <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
        <Text style={{ textAlign: 'center', marginTop: 12 }}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  )
}

function HomeScreen({ navigation }: any) {
  const { user, signOut } = useAuth()
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontSize: 18 }}>Welcome {user?.email}</Text>
      <Button title="Account" onPress={() => navigation.navigate('Account')} />
      <Button title="Sign out" onPress={signOut} />
    </View>
  )
}

function AccountScreen() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      if (!error && data) setFullName((data as any).full_name ?? '')
    }
    load()
  }, [user])

  const save = async () => {
    if (!user) return
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, full_name: fullName, updated_at: new Date().toISOString() })
    setLoading(false)
    if (error) Alert.alert('Save failed', error.message)
    else Alert.alert('Saved', 'Profile updated')
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '600', marginBottom: 8 }}>Your account</Text>
      <Text>Full name</Text>
      <TextInput
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
        style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
      />
      <Button title={loading ? 'Saving…' : 'Save'} onPress={save} disabled={loading} />
    </View>
  )
}

// ---------------------------------------------------------------
// 5) App root
// ---------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  )
}

// ---------------------------------------------------------------
// 6) Setup notes (read me)
// ---------------------------------------------------------------
// 1) Install deps:
//    npm i @supabase/supabase-js @react-native-async-storage/async-storage
//    npm i @react-navigation/native @react-navigation/native-stack
//    npx expo install react-native-screens react-native-safe-area-context
//
// 2) Add .env:
//    EXPO_PUBLIC_SUPABASE_URL= https://ospifbrczlydnqxedaxf.supabase.co
//    EXPO_PUBLIC_SUPABASE_KEY= <your-ANON-key>
//
// 3) profiles table (SQL example):
//    create table if not exists public.profiles (
//      id uuid primary key references auth.users(id) on delete cascade,
//      full_name text,
//      updated_at timestamptz
//    );
//    alter table public.profiles enable row level security;
//    create policy "Read own profile" on public.profiles for select using (auth.uid() = id);
//    create policy "Insert own profile" on public.profiles for insert with check (auth.uid() = id);
//    create policy "Update own profile" on public.profiles for update using (auth.uid() = id);
//
// 4) Expo dev: `npx expo start`
//
// 5) If you later add phone OTP or magic links, enable the provider in Supabase → Authentication → Providers,
//    then add the appropriate calls (signInWithOtp/verifyOtp). Keep detectSessionInUrl:false.
