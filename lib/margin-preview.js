export function marginScenario({priceCents,credits,costPerCreditUsd,feePercent=0,feeFixedUsd=0}) {
 if(!Number.isSafeInteger(priceCents)||priceCents<=0||!Number.isSafeInteger(credits)||credits<=0)return null;
 const revenueUsd=priceCents/100,unitRevenueUsd=revenueUsd/credits;
 if(!Number.isFinite(costPerCreditUsd)||costPerCreditUsd<0)return {revenueUsd,unitRevenueUsd,costUsd:null,contributionUsd:null,marginPercent:null};
 const costUsd=credits*costPerCreditUsd,feeUsd=revenueUsd*feePercent/100+feeFixedUsd;
 const contributionUsd=revenueUsd-costUsd-feeUsd;
 return {revenueUsd,unitRevenueUsd,costUsd,feeUsd,contributionUsd,marginPercent:contributionUsd/revenueUsd*100};
}
export function monthlyScenario({membership,bank,membershipSales,bankSales,freeCredits,fixedCostsUsd,costPerCreditUsd}) {
 if(!membership||!bank||membership.contributionUsd==null||bank.contributionUsd==null)return null;
 const freeCostUsd=freeCredits*costPerCreditUsd;
 const revenueUsd=membershipSales*membership.revenueUsd+bankSales*bank.revenueUsd;
 const operatingResultUsd=membershipSales*membership.contributionUsd+bankSales*bank.contributionUsd-freeCostUsd-fixedCostsUsd;
 const burden=freeCostUsd+fixedCostsUsd;
 return {revenueUsd,freeCostUsd,operatingResultUsd,membershipBreakEven:membership.contributionUsd>0?Math.ceil(burden/membership.contributionUsd):null,bankBreakEven:bank.contributionUsd>0?Math.ceil(burden/bank.contributionUsd):null};
}
