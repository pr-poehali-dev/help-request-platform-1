import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';

type TaskStatus = 'new' | 'in_progress' | 'completed';
type UserRole = 'client' | 'worker';

interface Task {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  date: string;
  status: TaskStatus;
  author: {
    name: string;
    rating: number;
    avatar?: string;
  };
  responses: number;
}

const TASKS_API = 'https://functions.poehali.dev/3710bde1-a547-479f-8c8c-d3c144645ec1';
const USERS_API = 'https://functions.poehali.dev/f0a809b3-2c7e-4395-8f2c-259f3326e081';

const categories = ['Все категории', 'Ремонт', 'Бытовые услуги', 'Ремонт техники', 'Переезды', 'IT услуги', 'Уборка'];

const faqItems = [
  {
    question: 'Как начать работать на платформе?',
    answer: 'Зарегистрируйтесь, выберите роль (заказчик или исполнитель), заполните профиль. Заказчики могут сразу создавать задачи, исполнители — откликаться на них.'
  },
  {
    question: 'Как гарантируется безопасность сделки?',
    answer: 'Мы используем систему рейтингов и отзывов. Деньги переводятся исполнителю только после подтверждения заказчиком выполнения работы.'
  },
  {
    question: 'Какая комиссия платформы?',
    answer: 'Для заказчиков — бесплатно. Исполнители платят 10% от суммы заказа после успешного завершения.'
  },
  {
    question: 'Можно ли отменить задачу?',
    answer: 'Да, заказчик может отменить задачу до момента начала работы исполнителя. После начала работы отмена согласовывается с исполнителем.'
  },
  {
    question: 'Как повысить рейтинг?',
    answer: 'Выполняйте заказы качественно и в срок, получайте положительные отзывы, будьте вежливы и ответственны.'
  }
];

export default function Index() {
  const [userRole, setUserRole] = useState<UserRole>('client');
  const [selectedCategory, setSelectedCategory] = useState('Все категории');
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [selectedCategory]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const url = selectedCategory === 'Все категории' 
        ? TASKS_API 
        : `${TASKS_API}?category=${encodeURIComponent(selectedCategory)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load tasks');
      
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить задачи',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks;

  const handleLogout = () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    setUser(null);
    toast({
      title: 'Выход выполнен',
      description: 'До скорой встречи!'
    });
  };

  const getStatusBadge = (status: TaskStatus) => {
    const variants = {
      new: { label: 'Новая', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
      in_progress: { label: 'В работе', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
      completed: { label: 'Завершена', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' }
    };
    const { label, className } = variants[status];
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                <Icon name="Wrench" size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                TaskMaster
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-sm">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.role === 'client' ? 'Заказчик' : 'Исполнитель'}</p>
                    </div>
                  </div>
                  <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                    <Icon name="Bell" size={18} className="mr-2" />
                    Уведомления
                    <Badge className="ml-2 bg-white text-primary hover:bg-white">3</Badge>
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    <Icon name="LogOut" size={18} className="mr-2" />
                    Выйти
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => navigate('/login')}>
                    <Icon name="LogIn" size={18} className="mr-2" />
                    Войти
                  </Button>
                  <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90" onClick={() => navigate('/register')}>
                    <Icon name="UserPlus" size={18} className="mr-2" />
                    Регистрация
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="py-20 bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold mb-6 animate-fade-in">
            Найдите мастера или работу за минуты
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto animate-fade-in">
            Быстрая платформа для поиска исполнителей и заказчиков. Безопасно, удобно, выгодно.
          </p>
          <div className="flex gap-4 justify-center animate-scale-in">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-white text-primary hover:bg-gray-100 hover-scale">
                  <Icon name="Plus" size={20} className="mr-2" />
                  Создать задачу
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Создать новую задачу</DialogTitle>
                  <DialogDescription>
                    Опишите задачу и укажите цену. Исполнители увидят её и смогут откликнуться.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input placeholder="Название задачи" />
                  <Textarea placeholder="Подробное описание..." rows={4} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input placeholder="Цена (₽)" type="number" />
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Категория" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.slice(1).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="Город, район" />
                  <Input placeholder="Дата выполнения" type="date" />
                  <Button className="w-full bg-gradient-to-r from-primary to-accent">
                    Опубликовать задачу
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary hover-scale">
              <Icon name="Search" size={20} className="mr-2" />
              Найти задачу
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { icon: 'Zap', title: 'Быстро', desc: 'Отклики от исполнителей уже через 5 минут', color: 'from-orange-400 to-red-500' },
              { icon: 'Shield', title: 'Безопасно', desc: 'Рейтинги, отзывы и проверенные профили', color: 'from-blue-400 to-cyan-500' },
              { icon: 'DollarSign', title: 'Выгодно', desc: 'Конкурентные цены и прозрачные условия', color: 'from-green-400 to-emerald-500' }
            ].map((item, idx) => (
              <Card key={idx} className="border-none shadow-lg hover-scale animate-fade-in">
                <CardContent className="pt-6 text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center`}>
                    <Icon name={item.icon as any} size={32} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <Icon name="ListTodo" size={16} />
                Задачи
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <Icon name="User" size={16} />
                Профиль
              </TabsTrigger>
              <TabsTrigger value="faq" className="flex items-center gap-2">
                <Icon name="HelpCircle" size={16} />
                FAQ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <h2 className="text-3xl font-bold">Доступные задачи</h2>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Icon name="Loader2" size={48} className="animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTasks.map((task) => (
                  <Card key={task.id} className={`hover-scale border-none shadow-lg ${task.status === 'new' ? 'animate-pulse-glow' : ''}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary">{task.category}</Badge>
                        {getStatusBadge(task.status)}
                      </div>
                      <CardTitle className="text-xl">{task.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{task.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon name="MapPin" size={16} />
                        <span>{task.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Icon name="Calendar" size={16} />
                        <span>{task.date}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={task.author.avatar} />
                            <AvatarFallback>{task.author.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{task.author.name}</p>
                            <div className="flex items-center gap-1">
                              <Icon name="Star" size={12} className="text-yellow-500 fill-yellow-500" />
                              <span className="text-xs text-muted-foreground">{task.author.rating}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{task.price} ₽</p>
                          <p className="text-xs text-muted-foreground">{task.responses} откликов</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
                        <Icon name="Send" size={16} className="mr-2" />
                        Откликнуться
                      </Button>
                    </CardFooter>
                  </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary to-accent text-white rounded-t-lg">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20 border-4 border-white">
                      <AvatarFallback className="text-2xl">ИП</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl">Иван Петров</CardTitle>
                      <CardDescription className="text-white/80">Исполнитель с июня 2024</CardDescription>
                      <div className="flex items-center gap-1 mt-1">
                        <Icon name="Star" size={16} className="text-yellow-300 fill-yellow-300" />
                        <Icon name="Star" size={16} className="text-yellow-300 fill-yellow-300" />
                        <Icon name="Star" size={16} className="text-yellow-300 fill-yellow-300" />
                        <Icon name="Star" size={16} className="text-yellow-300 fill-yellow-300" />
                        <Icon name="Star" size={16} className="text-yellow-300 fill-yellow-300" />
                        <span className="ml-2 text-sm">5.0</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-3xl font-bold text-primary">47</p>
                      <p className="text-sm text-muted-foreground">Выполнено задач</p>
                    </div>
                    <div className="text-center p-4 bg-pink-50 rounded-lg">
                      <p className="text-3xl font-bold text-accent">156 000 ₽</p>
                      <p className="text-sm text-muted-foreground">Заработано</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-3xl font-bold text-blue-500">98%</p>
                      <p className="text-sm text-muted-foreground">Положительных отзывов</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Специализация</h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge>Ремонт техники</Badge>
                        <Badge>Сантехника</Badge>
                        <Badge>Электрика</Badge>
                        <Badge>IT услуги</Badge>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">О себе</h3>
                      <p className="text-muted-foreground">
                        Опытный мастер с 8-летним стажем. Работаю быстро и качественно. 
                        Всегда на связи, гарантия на работы 6 месяцев.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>История работ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { task: 'Ремонт стиральной машины', date: '10.01.2026', price: 2500, rating: 5 },
                    { task: 'Установка розеток', date: '08.01.2026', price: 1500, rating: 5 },
                    { task: 'Настройка Wi-Fi роутера', date: '05.01.2026', price: 800, rating: 4 }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="font-medium">{item.task}</p>
                        <p className="text-sm text-muted-foreground">{item.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{item.price} ₽</p>
                        <div className="flex items-center gap-1 justify-end">
                          {Array.from({ length: item.rating }).map((_, i) => (
                            <Icon key={i} name="Star" size={12} className="text-yellow-500 fill-yellow-500" />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="faq" className="space-y-6">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-3xl">Часто задаваемые вопросы</CardTitle>
                  <CardDescription>Ответы на популярные вопросы о работе платформы</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqItems.map((item, idx) => (
                      <AccordionItem key={idx} value={`item-${idx}`}>
                        <AccordionTrigger className="text-left font-semibold">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-r from-primary to-accent text-white">
                <CardHeader>
                  <CardTitle>Не нашли ответ?</CardTitle>
                  <CardDescription className="text-white/80">
                    Свяжитесь с нашей службой поддержки
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="secondary" size="lg" className="hover-scale">
                    <Icon name="MessageCircle" size={20} className="mr-2" />
                    Написать в поддержку
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <footer className="border-t mt-16 py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Icon name="Wrench" size={20} className="text-primary" />
                TaskMaster
              </h3>
              <p className="text-sm text-muted-foreground">
                Платформа для поиска исполнителей и заказчиков
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Компания</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">О нас</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Вакансии</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Блог</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Помощь</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Контакты</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Правила</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Контакты</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Icon name="Mail" size={16} />
                  <span>info@taskmaster.ru</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icon name="Phone" size={16} />
                  <span>+7 (495) 123-45-67</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border-t pt-6 text-center text-sm text-muted-foreground">
            <p>© 2026 TaskMaster. Все права защищены.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}