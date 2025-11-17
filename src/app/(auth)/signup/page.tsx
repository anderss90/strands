import Link from 'next/link';
import SignUpForm from '@/components/auth/SignUpForm';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Strands</h1>
          <p className="text-lg text-gray-300 mb-2 font-medium">The first strand type group chat app</p>
          <p className="text-gray-400">Create your account</p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-sm p-8 border border-gray-700">
          <SignUpForm />
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

