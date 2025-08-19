class EmailCounter {
    private count: number = 0;
    private readonly dailyLimit: number = 500; // Límite diario de Gmail

    increment(): void {
        this.count++;
    }

    getCount(): number {
        return this.count;
    }

    getRemaining(): number {
        return this.dailyLimit - this.count;
    }

    getUsageMessage(): string {
        const remaining = this.getRemaining();
        return `Correos enviados: ${this.count} | Restantes hoy: ${remaining} | Límite: ${this.dailyLimit}`;
    }
}

export const emailCounter = new EmailCounter();