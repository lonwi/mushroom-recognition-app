import { Text, type TextProps } from 'react-native';

type AppTextProps = TextProps & {
  className?: string;
  emphasis?: boolean;
};

export function AppText({ children, className, emphasis = false, style, ...rest }: AppTextProps) {
  const weight = emphasis ? 'font-semibold' : 'font-sans';
  const classes = ['text-base text-ink', weight, className].filter(Boolean).join(' ');
  return (
    <Text className={classes} style={style} {...rest}>
      {children}
    </Text>
  );
}
