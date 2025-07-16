import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Phone, PhoneCall, Loader2, Trash2 } from "lucide-react"
import { usePhoneStore } from "@/store/phone-store"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ProviderType = "twilio" | "sip_trunk" | null

const twilioSchema = z.object({
  label: z.string().min(1, "Название номера обязательно").min(2, "Название должно содержать минимум 2 символа"),
  phoneNumber: z.string().min(1, "Номер телефона обязателен").regex(/^\+\d{10,15}$/, "Номер телефона должен начинаться с + и содержать от 10 до 15 цифр"),
  accountSid: z.string().min(1, "Account SID обязателен").min(30, "Account SID должен содержать минимум 30 символов"),
  authToken: z.string().min(1, "Auth Token обязателен").min(30, "Auth Token должен содержать минимум 30 символов")
})

const sipTrunkSchema = z.object({
  label: z.string().min(1, "Название номера обязательно").min(2, "Название должно содержать минимум 2 символа"),
  phoneNumber: z.string().min(1, "Номер телефона обязателен").regex(/^\+\d{10,15}$/, "Номер телефона должен начинаться с + и содержать от 10 до 15 цифр"),
  address: z.string().min(1, "Адрес обязателен"),
  originationUri: z.enum([
    "sip:sip.rtc.elevenlabs.io:5060;transport=tcp",
    "sip:sip.rtc.elevenlabs.io:5061;transport=tls"
  ]),
  transport: z.enum(["tls", "tcp", "udp", "auto"]),
  mediaEncryption: z.enum(["allowed", "disabled", "required"]),
  username: z.string().default(""),
  password: z.string().default(""),
  headers: z.array(z.object({
    key: z.string(),
    value: z.string()
  })).default([])
})

type TwilioFormData = z.infer<typeof twilioSchema>

export function ImportPhoneNumberDialog() {
  const { createTwilioPhoneNumber, createSipTrunkPhoneNumber } = usePhoneStore()
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const twilioForm = useForm<TwilioFormData>({
    resolver: zodResolver(twilioSchema),
    defaultValues: {
      label: "",
      phoneNumber: "",
      accountSid: "",
      authToken: ""
    },
    mode: "onChange"
  })

  const sipTrunkForm = useForm({
    resolver: zodResolver(sipTrunkSchema),
    defaultValues: {
      label: "",
      phoneNumber: "",
      address: "",
      originationUri: "sip:sip.rtc.elevenlabs.io:5060;transport=tcp" as const,
      transport: "tcp" as const,
      mediaEncryption: "allowed" as const,
      username: "",
      password: "",
      headers: [] as Array<{ key: string; value: string }>
    },
    mode: "onChange" as const
  })

  const handleProviderSelect = (provider: ProviderType) => {
    setSelectedProvider(provider)
    setIsSheetOpen(true)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open) {
      // При закрытии диалога сбрасываем состояние
      setSelectedProvider(null)
      setIsSubmitting(false)
      // Сбрасываем формы
      twilioForm.reset()
      sipTrunkForm.reset()
    }
  }

  const handleTwilioSubmit = async (data: TwilioFormData) => {
    setIsSubmitting(true)
    
    try {
      const result = await createTwilioPhoneNumber({
        phoneNumber: data.phoneNumber,
        label: data.label,
        sid: data.accountSid,
        token: data.authToken
      })

      if (result.success) {
        // Очищаем форму и закрываем диалог
        twilioForm.reset()
        setIsSheetOpen(false)
        setSelectedProvider(null)
      }
      // Ошибки уже обрабатываются в store
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSipTrunkSubmit = async (data: z.infer<typeof sipTrunkSchema>) => {
    setIsSubmitting(true)
    
    try {
      // Преобразуем headers массив в объект
      const headersObject = data.headers?.reduce((acc: Record<string, string>, header: { key: string; value: string }) => {
        if (header.key && header.value) {
          acc[header.key] = header.value
        }
        return acc
      }, {} as Record<string, string>) || {}

      const result = await createSipTrunkPhoneNumber({
        phoneNumber: data.phoneNumber,
        label: data.label,
        address: data.address,
        origination_uri: data.originationUri,
        credentials: {
          username: data.username,
          password: data.password
        },
        media_encryption: data.mediaEncryption,
        headers: headersObject,
        transport: data.transport
      })

      if (result.success) {
        // Очищаем форму и закрываем диалог
        sipTrunkForm.reset()
        setIsSheetOpen(false)
        setSelectedProvider(null)
      }
      // Ошибки уже обрабатываются в store
    } finally {
      setIsSubmitting(false)
    }
  }

  const addHeader = () => {
    const currentHeaders = sipTrunkForm.getValues("headers") || []
    sipTrunkForm.setValue("headers", [...currentHeaders, { key: "", value: "" }])
  }

  const removeHeader = (index: number) => {
    const currentHeaders = sipTrunkForm.getValues("headers") || []
    sipTrunkForm.setValue("headers", currentHeaders.filter((_, i) => i !== index))
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            Импортировать номер
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={() => handleProviderSelect("twilio")}
            className="cursor-pointer"
          >
            <Phone className="mr-2 h-4 w-4" />
            Из Twilio
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleProviderSelect("sip_trunk")}
            className="cursor-pointer"
          >
            <PhoneCall className="mr-2 h-4 w-4" />
            Из SIP Trunk
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Twilio Import Sheet */}
      {selectedProvider === "twilio" && (
        <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetContent side="right" className="w-1/2 !max-w-full px-6 overflow-y-auto">
            <SheetHeader className="pb-6">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4" />
                <SheetTitle className="text-xl">Импорт номера из Twilio</SheetTitle>
              </div>
              <SheetDescription className="text-gray-600">
                Добавьте ваш номер телефона Twilio в аккаунт
              </SheetDescription>
            </SheetHeader>

            <Form {...twilioForm}>
              <form onSubmit={twilioForm.handleSubmit(handleTwilioSubmit)} className="space-y-8 py-6">
                <FormField
                  control={twilioForm.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Название номера
                      </Label>
                      <FormControl>
                        <Input
                          placeholder="Легко запоминающееся название номера телефона"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={twilioForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Номер телефона
                      </Label>
                      <FormControl>
                        <Input
                          placeholder="+1234567890"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={twilioForm.control}
                  name="accountSid"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Twilio Account SID
                      </Label>
                      <FormControl>
                        <Input
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="h-11 font-mono"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={twilioForm.control}
                  name="authToken"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Twilio Auth Token
                      </Label>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••••••••••••••••••••••••••"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <SheetFooter className="pt-8 pb-6">
                  <Button 
                    type="submit"
                    disabled={isSubmitting || !twilioForm.formState.isValid}
                    className="cursor-pointer w-full h-11 text-base font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      'Импортировать'
                    )}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      )}

      {/* SIP Trunk Import Sheet */}
      {selectedProvider === "sip_trunk" && (
        <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
          <SheetContent side="right" className="w-1/2 !max-w-full px-6 overflow-y-auto">
            <SheetHeader className="pb-6">
              <div className="flex items-center gap-3">
                <PhoneCall className="h-4 w-4" />
                <SheetTitle className="text-xl">Импорт SIP Trunk</SheetTitle>
              </div>
              <SheetDescription className="text-gray-600">
                Настройте подключение SIP trunk
              </SheetDescription>
            </SheetHeader>

            <Form {...sipTrunkForm}>
              <form onSubmit={sipTrunkForm.handleSubmit(handleSipTrunkSubmit)} className="space-y-8 py-6">
                <FormField
                  control={sipTrunkForm.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Название номера
                      </Label>
                      <FormControl>
                        <Input
                          placeholder="Легко запоминающееся название номера телефона"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sipTrunkForm.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Номер телефона
                      </Label>
                      <FormControl>
                        <Input
                          placeholder="+1234567890"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sipTrunkForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Адрес
                      </Label>
                      <FormControl>
                        <Input
                          placeholder=""
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500 px-1">
                        Имя хоста или IP-адрес, на который отправляется SIP INVITE. Это не SIP URI и не должно содержать протокол sip:
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sipTrunkForm.control}
                  name="originationUri"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">
                        URI исходящих вызовов
                      </Label>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} defaultValue="sip:sip.rtc.elevenlabs.io:5060;transport=tcp">
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Выберите URI исходящих вызовов" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sip:sip.rtc.elevenlabs.io:5060;transport=tcp">sip:sip.rtc.elevenlabs.io:5060;transport=tcp</SelectItem>
                            <SelectItem value="sip:sip.rtc.elevenlabs.io:5061;transport=tls">sip:sip.rtc.elevenlabs.io:5061;transport=tls</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Outbound Configuration Section */}
                <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold text-gray-900">
                      Настройка исходящих вызовов
                    </Label>
                    <p className="text-sm text-gray-600">
                      Настройте, куда должен отправлять вызовы для вашего номера телефона
                    </p>
                  </div>

                  <FormField
                    control={sipTrunkForm.control}
                    name="transport"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">
                          Тип транспорта
                        </Label>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tls">TLS</SelectItem>
                              <SelectItem value="tcp">TCP</SelectItem>
                              <SelectItem value="udp">UDP</SelectItem>
                              <SelectItem value="auto">Авто</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sipTrunkForm.control}
                    name="mediaEncryption"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">
                          Шифрование медиа
                        </Label>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="allowed">Разрешено</SelectItem>
                              <SelectItem value="disabled">Отключено</SelectItem>
                              <SelectItem value="required">Обязательно</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold text-gray-900">
                        Пользовательские заголовки (необязательно)
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addHeader}
                        className="cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить заголовок
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Добавьте пользовательские SIP заголовки для включения в исходящие вызовы
                    </p>
                    
                    {sipTrunkForm.watch("headers")?.map((_, index) => (
                      <div key={index} className="flex gap-3 items-start">
                        <FormField
                          control={sipTrunkForm.control}
                          name={`headers.${index}.key`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder="Ключ заголовка"
                                  className="h-11"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={sipTrunkForm.control}
                          name={`headers.${index}.value`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  placeholder="Значение заголовка"
                                  className="h-11"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeHeader(index)}
                          className="cursor-pointer mt-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Authentication Section */}
                <div className="space-y-6">
                  <Label className="text-base font-semibold text-gray-900">
                    Аутентификация (необязательно)
                  </Label>
                  <p className="text-sm text-gray-500">
                    Предоставьте учетные данные дайджест-аутентификации, если этого требует ваш провайдер SIP trunk. Если оставить пустым, будет использоваться аутентификация ACL (вам нужно будет добавить IP-адреса ElevenLabs в белый список).
                  </p>
                  
                  <FormField
                    control={sipTrunkForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">
                          Имя пользователя SIP Trunk
                        </Label>
                        <FormControl>
                          <Input
                            placeholder="Имя пользователя для дайджест-аутентификации SIP"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={sipTrunkForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">
                          Пароль SIP Trunk
                        </Label>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Пароль для дайджест-аутентификации SIP"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <SheetFooter className="pt-8 pb-6">
                  <Button 
                    type="submit"
                    disabled={isSubmitting || !sipTrunkForm.formState.isValid}
                    className="cursor-pointer w-full h-11 text-base font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      'Импортировать'
                    )}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </SheetContent>
        </Sheet>
      )}
    </>
  )
} 