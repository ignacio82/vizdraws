# Gen data --------------------------------------------------------------
set.seed(9782)
x <- rnorm(1000)


# Usy my widget -----------------------------------------------------------
IMposterior(x= x, MME=1)




# With R ------------------------------------------------------------------

plotDensity <- function(x, cutoff=0) {

  breaks <- if(cutoff!=0){
    c(-Inf, -cutoff, cutoff, Inf)
  }else c(-Inf, cutoff, Inf)

  # Calculate density values for input data
  dens <- data.frame(density(x, n=2^10, adjust=1)[c("x","y")]) %>%
    dplyr::mutate(section = cut(x, breaks=breaks)) %>%
    dplyr::group_by(section) %>%
    dplyr::mutate(prob = paste0(round(sum(y)*mean(diff(x))*100),"%"))

  # Get probability mass for each level of section
  # We'll use these as the label values in scale_fill_manual
  sp <- dens %>%
    dplyr::group_by(section, prob) %>%
    summarise %>%
    ungroup %>%
    tidyr::complete(section, fill=list(prob="0%"))

  # Assign colors to each level of section
  col <- if(cutoff!=0){
    setNames(c("#e41a1c", "#377eb8", "#4daf4a"), levels(dens$section))
  }else setNames(c("#e41a1c", "#4daf4a", "#4daf4a"), levels(dens$section))

  p <- ggplot(dens, aes(x, y, fill=section)) +
    geom_area() +
    scale_fill_manual(labels=sp$prob, values=col, drop=FALSE) +
    labs(fill=expression(paste("Pr(", theta,"|data):"))) +
    theme_bw() +xlab("") +
    guides(fill=guide_legend(nrow=1,byrow=TRUE)) +
    theme(axis.title.y=element_blank(),
          axis.text.y=element_blank(),
          axis.ticks.y=element_blank()) +
    scale_x_continuous(breaks = scales::pretty_breaks(n = 10))
  return(p)
}

plotDensity(x, cutoff = 1)

