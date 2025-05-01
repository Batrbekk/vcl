import Image from "next/image"

export function AuthDecorator() {
  return (
    <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex overflow-hidden">
      <div className="absolute inset-0 bg-[#09090F]" />
      
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-full h-full">
        <Image
          src="/blob/1.svg"
          alt=""
          width={600}
          height={600}
          priority
          className="absolute -top-20 -left-40 opacity-20 w-[600px] h-[600px]"
        />
        <Image
          src="/blob/2.svg"
          alt=""
          width={600}
          height={600}
          priority
          className="absolute -bottom-40 -right-20 opacity-20 w-[500px] h-[500px]"
        />
        <Image
          src="/blob/3.svg"
          alt=""
          width={300}
          height={300}
          priority
          className="absolute top-0 right-0 w-[250px] h-[250px] animate-pulse"
          style={{ animationDuration: '10s' }}
        />
        <Image
          src="/blob/4.svg"
          alt=""
          width={250}
          height={250}
          priority
          className="absolute bottom-10 left-0 w-[200px] h-[200px] animate-pulse"
          style={{ animationDuration: '15s' }}
        />
      </div>
      
      <div className="relative z-20 flex items-center">
        <Image
          src="/logo.svg"
          alt="Логотип"
          width={126}
          height={48}
          priority
          className="h-auto w-auto"
        />
      </div>
      <div className="relative z-20 mt-auto">
        <blockquote className="space-y-2">
          <p className="text-lg">
            &ldquo;Эта библиотека сэкономила мне бесчисленное количество часов работы и
            помогла быстрее предоставить моим клиентам потрясающие дизайны.&rdquo;
          </p>
          <footer className="text-sm">София Дэвис</footer>
        </blockquote>
      </div>
    </div>
  )
} 