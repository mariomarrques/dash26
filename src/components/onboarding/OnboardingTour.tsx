import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, Styles } from 'react-joyride';
import { useIsMobile } from '@/hooks/use-mobile';

interface OnboardingTourProps {
  run: boolean;
  onComplete: () => void;
}

export const OnboardingTour = ({ run, onComplete }: OnboardingTourProps) => {
  const isMobile = useIsMobile();
  const [stepIndex, setStepIndex] = useState(0);

  // Desktop steps (7 steps)
  const desktopSteps: Step[] = [
    {
      target: '[data-tour="dashboard-kpis"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Visão geral do seu negócio</h3>
          <p className="text-sm text-muted-foreground">
            Aqui você acompanha, em tempo real, quanto está faturando, lucrando e como está seu estoque no período selecionado.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="period-selector"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Análise por período</h3>
          <p className="text-sm text-muted-foreground">
            Use este filtro para analisar diferentes períodos do seu negócio.<br />
            Compare dias, semanas ou meses para entender sua evolução.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="btn-nova-venda"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Registrar uma venda</h3>
          <p className="text-sm text-muted-foreground">
            Clique aqui sempre que fizer uma venda.<br />
            O Dash 26 calcula automaticamente o impacto no faturamento, lucro e estoque.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="nav-compras"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Registrar compras</h3>
          <p className="text-sm text-muted-foreground">
            Cadastre aqui suas compras de produtos.<br />
            Essas informações são essenciais para que o lucro seja calculado corretamente.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-estoque"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Controle de estoque</h3>
          <p className="text-sm text-muted-foreground">
            Acompanhe quantos produtos você tem disponíveis e evite surpresas na operação.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-margens"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Análise de resultados</h3>
          <p className="text-sm text-muted-foreground">
            Veja como está a margem do seu negócio e entenda se suas vendas estão realmente valendo a pena.
          </p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '[data-tour="nav-configuracoes"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Personalize o Dash 26</h3>
          <p className="text-sm text-muted-foreground">
            Ajuste custos fixos, taxas e preferências para deixar o Dash 26 de acordo com a sua realidade.
          </p>
        </div>
      ),
      placement: 'right',
    },
  ];

  // Mobile steps (5 steps)
  const mobileSteps: Step[] = [
    {
      target: '[data-tour="dashboard-kpis"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Seu negócio em números</h3>
          <p className="text-sm text-muted-foreground">
            Esses cards mostram o resumo do seu negócio no período selecionado.
          </p>
        </div>
      ),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="period-selector"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Filtrar resultados</h3>
          <p className="text-sm text-muted-foreground">
            Use o filtro para analisar diferentes períodos e acompanhar sua evolução.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="fab-main"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Ações rápidas</h3>
          <p className="text-sm text-muted-foreground">
            Use este botão para registrar vendas ou compras rapidamente.
          </p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '[data-tour="menu-toggle"]',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Navegação</h3>
          <p className="text-sm text-muted-foreground">
            Acesse vendas, compras, estoque, margens e configurações por aqui.
          </p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: 'body',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Tudo sob controle</h3>
          <p className="text-sm text-muted-foreground">
            O Dash 26 foi feito para te dar clareza, organização e controle sobre o seu negócio.
          </p>
        </div>
      ),
      placement: 'center',
    },
  ];

  const steps = isMobile ? mobileSteps : desktopSteps;

  // Custom styles matching Dash 26 design system
  const styles: Styles = {
    options: {
      primaryColor: 'hsl(var(--primary))',
      textColor: 'hsl(var(--foreground))',
      backgroundColor: 'hsl(var(--background))',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      arrowColor: 'hsl(var(--background))',
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    },
    tooltipContainer: {
      textAlign: 'left',
    },
    tooltipContent: {
      padding: '0',
    },
    buttonNext: {
      backgroundColor: 'hsl(var(--primary))',
      borderRadius: '8px',
      fontSize: '14px',
      padding: '10px 24px',
      fontWeight: '500',
    },
    buttonBack: {
      color: 'hsl(var(--muted-foreground))',
      fontSize: '14px',
      marginRight: '8px',
    },
    buttonSkip: {
      color: 'hsl(var(--muted-foreground))',
      fontSize: '14px',
    },
    buttonClose: {
      display: 'none',
    },
  };

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;

    if (([STATUS.FINISHED, STATUS.SKIPPED] as string[]).includes(status)) {
      onComplete();
      setStepIndex(0);
    } else if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  };

  useEffect(() => {
    if (run) {
      setStepIndex(0);
    }
  }, [run]);

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      disableScrolling={false}
      disableOverlayClose={false}
      spotlightClicks={false}
      styles={styles}
      callback={handleJoyrideCallback}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        skip: 'Pular',
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
};
